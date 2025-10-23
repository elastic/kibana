/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getFlattenedObject } from '@kbn/std';
import type { SampleDocument } from '@kbn/streams-schema';
import { fieldDefinitionConfigSchema, Streams } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { SearchHit } from '@kbn/es-types';
import type { StreamsMappingProperties } from '@kbn/streams-schema/src/fields';
import type { DocumentWithIgnoredFields } from '@kbn/streams-schema/src/shared/record_types';
import { LOGS_ROOT_STREAM_NAME } from '../../../../lib/streams/root_stream_definition';
import { MAX_PRIORITY } from '../../../../lib/streams/index_templates/generate_index_template';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { createServerRoute } from '../../../create_server_route';

const UNMAPPED_SAMPLE_SIZE = 500;

export const unmappedFieldsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/schema/unmapped_fields',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ unmappedFields: string[] }> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });

    const searchBody = {
      sort: [
        {
          '@timestamp': {
            order: 'desc' as const,
          },
        },
      ],
      size: UNMAPPED_SAMPLE_SIZE,
    };

    const [streamDefinition, ancestors, results] = await Promise.all([
      streamsClient.getStream(params.path.name),
      streamsClient.getAncestors(params.path.name),
      scopedClusterClient.asCurrentUser.search({
        index: params.path.name,
        ...searchBody,
      }),
    ]);

    const sourceFields = new Set<string>();

    results.hits.hits.forEach((hit) => {
      Object.keys(getFlattenedObject(hit._source as Record<string, unknown>)).forEach((field) => {
        sourceFields.add(field);
      });
    });

    // Mapped fields from the stream's definition and inherited from ancestors
    const mappedFields = new Set<string>();

    if (Streams.ClassicStream.Definition.is(streamDefinition)) {
      Object.keys(streamDefinition.ingest.classic.field_overrides || {}).forEach((name) =>
        mappedFields.add(name)
      );
    }

    if (Streams.WiredStream.Definition.is(streamDefinition)) {
      Object.keys(streamDefinition.ingest.wired.fields).forEach((name) => mappedFields.add(name));
    }

    for (const ancestor of ancestors) {
      Object.keys(ancestor.ingest.wired.fields).forEach((name) => mappedFields.add(name));
    }

    const unmappedFields = Array.from(sourceFields)
      .filter((field) => !mappedFields.has(field))
      .sort();

    return { unmappedFields };
  },
});

const FIELD_SIMILATION_SAMPLE_SIZE = 200;

export const schemaFieldsSimulationRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/schema/fields_simulation',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z.object({
      field_definitions: z.array(
        z.intersection(fieldDefinitionConfigSchema, z.object({ name: z.string() }))
      ),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<{
    status: 'unknown' | 'success' | 'failure';
    simulationError: string | null;
    documentsWithRuntimeFieldsApplied: DocumentWithIgnoredFields[] | null;
  }> => {
    const { scopedClusterClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot read stream ${params.path.name}, insufficient privileges`);
    }

    const userFieldDefinitions = params.body.field_definitions.flatMap((field) => {
      // filter out potential system fields since we can't simulate them anyway
      if (field.type === 'system') {
        return [];
      }
      return [field];
    });

    const propertiesForSample = Object.fromEntries(
      userFieldDefinitions.map((field) => [field.name, { type: 'keyword' as const }])
    );

    const documentSamplesSearchBody = {
      // Add keyword runtime mappings so we can pair with exists, this is to attempt to "miss" less documents for the simulation.
      runtime_mappings: propertiesForSample,
      query: {
        bool: {
          filter: Object.keys(propertiesForSample).map((field) => ({
            exists: { field },
          })),
        },
      },
      sort: [
        {
          '@timestamp': {
            order: 'desc' as const,
          },
        },
      ],
      size: FIELD_SIMILATION_SAMPLE_SIZE,
    };

    const sampleResults = await scopedClusterClient.asCurrentUser.search({
      index: params.path.name,
      ...documentSamplesSearchBody,
    });

    if (
      (typeof sampleResults.hits.total === 'object' && sampleResults.hits.total?.value === 0) ||
      sampleResults.hits.total === 0 ||
      !sampleResults.hits.total
    ) {
      return {
        status: 'unknown',
        simulationError: null,
        documentsWithRuntimeFieldsApplied: null,
      };
    }

    const propertiesForSimulation = Object.fromEntries(
      userFieldDefinitions.map(({ name, ...field }) => [name, field])
    );

    const fieldDefinitionKeys = Object.keys(propertiesForSimulation);

    const sampleResultsAsSimulationDocs = sampleResults.hits.hits.map((hit) => ({
      // For wired streams direct writes to child streams are not allowed, we must use the "logs" index.
      _index: params.path.name.startsWith(`${LOGS_ROOT_STREAM_NAME}.`)
        ? LOGS_ROOT_STREAM_NAME
        : params.path.name,
      _id: hit._id,
      _source: Object.fromEntries(
        Object.entries(getFlattenedObject(hit._source as SampleDocument)).filter(
          ([k]) => fieldDefinitionKeys.includes(k) || k === '@timestamp'
        )
      ),
    }));

    const simulation = await simulateIngest(
      sampleResultsAsSimulationDocs,
      params.path.name,
      propertiesForSimulation,
      scopedClusterClient
    );

    const hasErrors = simulation.docs.some((doc: any) => doc.doc.error !== undefined);

    if (hasErrors) {
      const documentWithError = simulation.docs.find((doc: any) => {
        return doc.doc.error !== undefined;
      });

      return {
        status: 'failure',
        simulationError: JSON.stringify(
          // Use the first error as a representative error
          documentWithError.doc.error
        ),
        documentsWithRuntimeFieldsApplied: null,
      };
    }

    // Convert the field definitions to a format that can be used in runtime mappings (match_only_text -> keyword)
    const propertiesCompatibleWithRuntimeMappings = Object.fromEntries(
      userFieldDefinitions.map((field) => [
        field.name,
        {
          type: field.type === 'match_only_text' ? 'keyword' : field.type,
          ...(field.format ? { format: field.format } : {}),
        },
      ])
    );

    const runtimeFieldsSearchBody = {
      runtime_mappings: propertiesCompatibleWithRuntimeMappings,
      sort: [
        {
          '@timestamp': {
            order: 'desc' as const,
          },
        },
      ],
      size: FIELD_SIMILATION_SAMPLE_SIZE,
      fields: params.body.field_definitions.map((field) => field.name),
      _source: false,
    };

    // This gives us a "fields" representation rather than _source from the simulation
    const runtimeFieldsResult = await scopedClusterClient.asCurrentUser.search({
      index: params.path.name,
      query: {
        ids: {
          values: sampleResults.hits.hits.map((hit) => hit._id) as string[],
        },
      },
      ...runtimeFieldsSearchBody,
    });

    return {
      status: 'success',
      simulationError: null,
      documentsWithRuntimeFieldsApplied: runtimeFieldsResult.hits.hits.map((hit, index) => {
        if (!hit.fields) {
          return { ignored_fields: simulation.docs[index].doc.ignored_fields || [] };
        }
        return {
          values: Object.keys(hit.fields).reduce<SampleDocument>((acc, field) => {
            acc[field] = hit.fields![field][0];
            return acc;
          }, {}),
          ignored_fields: simulation.docs[index].doc.ignored_fields || [],
        };
      }),
    };
  },
});

export const internalSchemaRoutes = {
  ...unmappedFieldsRoute,
  ...schemaFieldsSimulationRoute,
};

const DUMMY_PIPELINE_NAME = '__dummy_pipeline__';

async function simulateIngest(
  sampleResultsAsSimulationDocs: Array<SearchHit<unknown>>,
  dataStreamName: string,
  propertiesForSimulation: StreamsMappingProperties,
  scopedClusterClient: IScopedClusterClient
) {
  // fetch the index template to get the base mappings
  const dataStream = await scopedClusterClient.asCurrentUser.indices.getDataStream({
    name: dataStreamName,
  });
  const indexTemplate = (
    await scopedClusterClient.asCurrentUser.indices.getIndexTemplate({
      name: dataStream.data_streams[0].template,
    })
  ).index_templates[0].index_template;

  // We need to build a patched index template instead of using mapping_addition
  // because of https://github.com/elastic/elasticsearch/issues/131608
  const patchedIndexTemplate = {
    ...indexTemplate,
    priority:
      indexTemplate.priority && indexTemplate.priority > MAX_PRIORITY
        ? // max priority passed as a string so we don't lose precision
          (`${MAX_PRIORITY}` as unknown as number)
        : indexTemplate.priority,
    composed_of: [...(indexTemplate.composed_of || []), '__DUMMY_COMPONENT_TEMPLATE__'],
    template: {
      ...indexTemplate.template,
      mappings: {
        ...indexTemplate.template?.mappings,
        properties: {
          ...indexTemplate.template?.mappings?.properties,
          ...propertiesForSimulation,
        },
      },
    },
  };
  const simulationBody = {
    docs: sampleResultsAsSimulationDocs,
    index_template_substitutions: {
      [dataStream.data_streams[0].template]: patchedIndexTemplate,
    },
    component_template_substitutions: {
      __DUMMY_COMPONENT_TEMPLATE__: {
        template: {
          mappings: {
            properties: propertiesForSimulation,
          },
        },
      },
    },
    pipeline_substitutions: {
      [DUMMY_PIPELINE_NAME]: {
        // The sampleResults are already gathered directly from the child stream index. But, we can't
        // simulate an _index other than logs for wired streams, this reroutes the documents back to the child stream.
        // After the reroute the override below ensures no double processing happens.
        processors: [
          ...(dataStreamName.startsWith(`${LOGS_ROOT_STREAM_NAME}.`)
            ? [
                {
                  reroute: {
                    destination: dataStreamName,
                  },
                },
              ]
            : []),
        ],
      },
      // prevent double-processing
      ...(dataStreamName.startsWith(`${LOGS_ROOT_STREAM_NAME}.`)
        ? {
            [`${dataStreamName}@stream.processing`]: {
              processors: [],
            },
          }
        : {}),
    },
  };

  // TODO: We should be using scopedClusterClient.asCurrentUser.simulate.ingest() but the ES JS lib currently has a bug. The types also aren't available yet, so we use any.
  const simulation = (await scopedClusterClient.asCurrentUser.transport.request({
    method: 'POST',
    path: `_ingest/_simulate?pipeline=${DUMMY_PIPELINE_NAME}`,
    body: simulationBody,
  })) as any;

  return simulation;
}
