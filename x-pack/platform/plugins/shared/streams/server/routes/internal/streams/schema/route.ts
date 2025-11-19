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
import { getProcessingPipelineName } from '../../../../lib/streams/ingest_pipelines/name';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { createServerRoute } from '../../../create_server_route';

const UNMAPPED_SAMPLE_SIZE = 500;
const FIELD_SIMULATION_TIMEOUT = '1s';

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
      .filter((field) => {
        // Skip if field is already mapped
        if (mappedFields.has(field)) return false;

        // Skip if field is a subfield of a mapped field (e.g., location.lat when location is mapped)
        for (const mappedField of mappedFields) {
          if (field.startsWith(`${mappedField}.`)) {
            return false;
          }
        }

        return true;
      })
      .sort();

    return { unmappedFields };
  },
});

const FIELD_SIMILATION_SAMPLE_SIZE = 20;

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
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot read stream ${params.path.name}, insufficient privileges`);
    }

    const streamDefinition = await streamsClient.getStream(params.path.name);

    const userFieldDefinitions = params.body.field_definitions.flatMap((field) => {
      // filter out potential system fields since we can't simulate them anyway
      if (field.type === 'system') {
        return [];
      }
      return [field];
    });

    // Build runtime mappings: for geo_point fields, also add .lat and .lon as keyword mappings
    const propertiesForSample: Record<string, { type: 'keyword' }> = {};
    userFieldDefinitions.forEach((field) => {
      propertiesForSample[field.name] = { type: 'keyword' as const };

      // For geo_point fields, also add lat/lon runtime mappings
      if (field.type === 'geo_point') {
        propertiesForSample[`${field.name}.lat`] = { type: 'keyword' as const };
        propertiesForSample[`${field.name}.lon`] = { type: 'keyword' as const };
      }
    });

    // Build filter conditions: for geo_point fields, check for either the base field OR both .lat and .lon
    const filterConditions = userFieldDefinitions.map((field) => {
      if (field.type === 'geo_point') {
        // For geo_point, accept documents that have either:
        // 1. The base field (e.g., "location")
        // 2. Both lat and lon fields (e.g., "location.lat" and "location.lon")
        return {
          bool: {
            should: [
              { exists: { field: field.name } },
              {
                bool: {
                  filter: [
                    { exists: { field: `${field.name}.lat` } },
                    { exists: { field: `${field.name}.lon` } },
                  ],
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
      }
      // For other types, just check the field exists
      return { exists: { field: field.name } };
    });

    const documentSamplesSearchBody = {
      // Add keyword runtime mappings so we can pair with exists, this is to attempt to "miss" less documents for the simulation.
      runtime_mappings: propertiesForSample,
      query: {
        bool: {
          filter: filterConditions,
        },
      },
      size: FIELD_SIMILATION_SAMPLE_SIZE,
      track_total_hits: false,
      terminate_after: FIELD_SIMILATION_SAMPLE_SIZE,
      timeout: FIELD_SIMULATION_TIMEOUT,
    };

    // eslint-disable-next-line no-console
    console.log(
      '[GEO_POINT DEBUG] Sample search body:',
      JSON.stringify(documentSamplesSearchBody, null, 2)
    );

    const sampleResults = await scopedClusterClient.asCurrentUser.search({
      index: params.path.name,
      ...documentSamplesSearchBody,
    });

    // eslint-disable-next-line no-console
    console.log('[GEO_POINT DEBUG] Found sample documents:', sampleResults.hits.hits.length);

    if (sampleResults.hits.hits.length === 0) {
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

    // Identify geo_point fields for special handling
    const geoPointFields = new Set(
      userFieldDefinitions.filter((field) => field.type === 'geo_point').map((field) => field.name)
    );

    // eslint-disable-next-line no-console
    console.log('[GEO_POINT DEBUG] Identified geo_point fields:', Array.from(geoPointFields));

    const sampleResultsAsSimulationDocs = sampleResults.hits.hits.map((hit) => {
      const flattenedSource = getFlattenedObject(hit._source as SampleDocument);

      // eslint-disable-next-line no-console
      console.log('[GEO_POINT DEBUG] Flattened source keys:', Object.keys(flattenedSource).sort());

      const filteredEntries = Object.entries(flattenedSource).filter(([k]) => {
        // Always include @timestamp
        if (k === '@timestamp') return true;

        // Include if it's a defined field
        if (fieldDefinitionKeys.includes(k)) return true;

        // For geo_point fields, also include .lat and .lon variants
        const latMatch = k.match(/^(.+)\.lat$/);
        const lonMatch = k.match(/^(.+)\.lon$/);
        if (
          (latMatch && geoPointFields.has(latMatch[1])) ||
          (lonMatch && geoPointFields.has(lonMatch[1]))
        ) {
          return true;
        }

        return false;
      });

      // eslint-disable-next-line no-console
      console.log('[GEO_POINT DEBUG] Filtered entries:', filteredEntries.map(([k]) => k).sort());

      // Handle geo_point fields: convert flattened lat/lon to proper geo_point object format
      const sourceWithGeoPoints: Record<string, any> = {};
      const processedGeoFields = new Set<string>();

      for (const [key, value] of filteredEntries) {
        // Check if this is a lat/lon component of a geo_point field
        const latMatch = key.match(/^(.+)\.lat$/);
        const lonMatch = key.match(/^(.+)\.lon$/);

        if (latMatch && geoPointFields.has(latMatch[1])) {
          const baseField = latMatch[1];
          if (!processedGeoFields.has(baseField)) {
            const lonKey = `${baseField}.lon`;
            const lonValue = flattenedSource[lonKey];
            // eslint-disable-next-line no-console
            console.log(
              '[GEO_POINT DEBUG] Found lat for',
              baseField,
              'lat:',
              value,
              'lon:',
              lonValue
            );
            if (lonValue !== undefined) {
              sourceWithGeoPoints[baseField] = { lat: value, lon: lonValue };
              processedGeoFields.add(baseField);
              // eslint-disable-next-line no-console
              console.log(
                '[GEO_POINT DEBUG] Created geo_point object for',
                baseField,
                sourceWithGeoPoints[baseField]
              );
            }
          }
        } else if (lonMatch && geoPointFields.has(lonMatch[1])) {
          const baseField = lonMatch[1];
          if (!processedGeoFields.has(baseField)) {
            const latKey = `${baseField}.lat`;
            const latValue = flattenedSource[latKey];
            if (latValue !== undefined) {
              sourceWithGeoPoints[baseField] = { lat: latValue, lon: value };
              processedGeoFields.add(baseField);
              // eslint-disable-next-line no-console
              console.log(
                '[GEO_POINT DEBUG] Created geo_point object for',
                baseField,
                sourceWithGeoPoints[baseField]
              );
            }
          }
        } else {
          // Not a geo_point component, add as-is
          sourceWithGeoPoints[key] = value;
        }
      }

      return {
        // For wired streams direct writes to child streams are not allowed, we must use the "logs" index.
        _index: params.path.name.startsWith(`${LOGS_ROOT_STREAM_NAME}.`)
          ? LOGS_ROOT_STREAM_NAME
          : params.path.name,
        _id: hit._id,
        _source: sourceWithGeoPoints,
      };
    });

    const simulation = await simulateIngest(
      sampleResultsAsSimulationDocs,
      params.path.name,
      propertiesForSimulation,
      scopedClusterClient,
      streamDefinition
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

    return {
      status: 'success',
      simulationError: null,
      documentsWithRuntimeFieldsApplied: simulation.docs.map((doc: any) => {
        return {
          values: doc.doc._source,
          ignored_fields: doc.doc.ignored_fields || [],
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
  scopedClusterClient: IScopedClusterClient,
  streamDefinition: Streams.all.Definition
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
  const isWiredStream = Streams.WiredStream.Definition.is(streamDefinition);

  let pipelineSubstitutions: Record<string, { processors: any[] }>;
  let simulatePath: string;

  if (isWiredStream) {
    // For wired streams: override root logs processing pipeline to reroute, then noop child stream processing
    pipelineSubstitutions = {
      [getProcessingPipelineName(LOGS_ROOT_STREAM_NAME)]: {
        processors: [
          {
            reroute: {
              destination: dataStreamName,
            },
          },
        ],
      },
      [getProcessingPipelineName(dataStreamName)]: {
        processors: [],
      },
    };
    simulatePath = '_ingest/_simulate';
  } else {
    // For classic streams: keep existing dummy pipeline approach
    pipelineSubstitutions = {
      [DUMMY_PIPELINE_NAME]: {
        processors: [],
      },
    };
    simulatePath = `_ingest/_simulate?pipeline=${DUMMY_PIPELINE_NAME}`;
  }

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
    pipeline_substitutions: pipelineSubstitutions,
  };

  // TODO: We should be using scopedClusterClient.asCurrentUser.simulate.ingest() but the ES JS lib currently has a bug. The types also aren't available yet, so we use any.
  const simulation = (await scopedClusterClient.asCurrentUser.transport.request({
    method: 'POST',
    path: simulatePath,
    body: simulationBody,
  })) as any;

  return simulation;
}
