/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getFlattenedObject } from '@kbn/std';
import type { SampleDocument } from '@kbn/streams-schema';
import { fieldDefinitionConfigSchema, isDescendantOf, Streams } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { SearchHit } from '@kbn/es-types';
import type { StreamsMappingProperties } from '@kbn/streams-schema/src/fields';
import type { DocumentWithIgnoredFields } from '@kbn/streams-schema/src/shared/record_types';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { getRoot } from '@kbn/streams-schema/src/shared/hierarchy';
import { LOGS_ROOT_STREAM_NAME } from '../../../../lib/streams/root_stream_definition';
import { MAX_PRIORITY } from '../../../../lib/streams/index_templates/generate_index_template';
import { getProcessingPipelineName } from '../../../../lib/streams/ingest_pipelines/name';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { createServerRoute } from '../../../create_server_route';
import {
  buildGeoPointExistsQuery,
  normalizeGeoPointsInObject,
  rebuildGeoPointsFromFlattened,
  collectFieldsWithGeoPoints,
} from '../../../../lib/streams/helpers/normalize_geo_points';

const UNMAPPED_SAMPLE_SIZE = 500;
const FIELD_SIMULATION_TIMEOUT = '1s';

interface SimulateIngestDoc {
  _source: SampleDocument;
  _index: string;
  _id: string;
  error?: {
    type: string;
    reason: string;
  };
  ignored_fields?: string[];
}

interface SimulateIngestDocResult {
  doc: SimulateIngestDoc;
}

interface SimulateIngestResult {
  docs: SimulateIngestDocResult[];
}

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
    const geoPointFields = new Set<string>();

    if (Streams.ClassicStream.Definition.is(streamDefinition)) {
      collectFieldsWithGeoPoints(
        streamDefinition.ingest.classic.field_overrides || {},
        mappedFields,
        geoPointFields
      );
    }

    if (Streams.WiredStream.Definition.is(streamDefinition)) {
      collectFieldsWithGeoPoints(
        streamDefinition.ingest.wired.fields,
        mappedFields,
        geoPointFields
      );
    }

    for (const ancestor of ancestors) {
      collectFieldsWithGeoPoints(ancestor.ingest.wired.fields, mappedFields, geoPointFields);
    }

    const unmappedFields = Array.from(sourceFields)
      .filter((field) => {
        if (mappedFields.has(field)) return false;

        const latMatch = field.match(/^(.+)\.lat$/);
        const lonMatch = field.match(/^(.+)\.lon$/);

        if (latMatch && geoPointFields.has(latMatch[1])) return false;
        if (lonMatch && geoPointFields.has(lonMatch[1])) return false;

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

    const propertiesForSample: Record<string, { type: 'keyword' }> = {};
    userFieldDefinitions.forEach((field) => {
      propertiesForSample[field.name] = { type: 'keyword' as const };

      if (field.type === 'geo_point') {
        propertiesForSample[`${field.name}.lat`] = { type: 'keyword' as const };
        propertiesForSample[`${field.name}.lon`] = { type: 'keyword' as const };
      }
    });

    const filterConditions = userFieldDefinitions.map((field) => {
      if (field.type === 'geo_point') {
        return buildGeoPointExistsQuery(field.name);
      }

      return { exists: { field: field.name } };
    });

    const documentSamplesSearchBody = {
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

    const sampleResults: SearchResponse<
      unknown,
      Record<string, AggregationsAggregate>
    > = await scopedClusterClient.asCurrentUser.search({
      index: params.path.name,
      // Add keyword runtime mappings so we can pair with exists, this is to attempt to "miss" less documents for the simulation.
      runtime_mappings: propertiesForSample,
      ...documentSamplesSearchBody,
    });

    if (sampleResults?.hits.hits.length === 0) {
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

    const geoPointFields = new Set(
      userFieldDefinitions.filter((field) => field.type === 'geo_point').map((field) => field.name)
    );

    const sampleResultsAsSimulationDocs = sampleResults.hits.hits.map((hit) => {
      const normalized = normalizeGeoPointsInObject(hit._source as SampleDocument, geoPointFields);
      const flattenedSource = getFlattenedObject(normalized);

      const sourceWithGeoPoints = rebuildGeoPointsFromFlattened(
        flattenedSource,
        fieldDefinitionKeys,
        geoPointFields
      );

      return {
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

    const hasErrors = simulation.docs.some((doc) => doc.doc.error !== undefined);

    if (hasErrors) {
      const documentWithError = simulation.docs.find((doc) => doc.doc.error !== undefined);

      return {
        status: 'failure',
        simulationError: JSON.stringify(
          // Use the first error as a representative error
          documentWithError?.doc.error
        ),
        documentsWithRuntimeFieldsApplied: null,
      };
    }

    return {
      status: 'success',
      simulationError: null,
      documentsWithRuntimeFieldsApplied: simulation.docs.map((doc) => ({
        values: doc.doc._source,
        ignored_fields: (doc.doc.ignored_fields || []).map((field) => ({ field })),
      })),
    };
  },
});

export interface FieldConflict {
  fieldName: string;
  proposedType: string;
  conflictingStreams: Array<{
    streamName: string;
    existingType: string;
  }>;
}

export interface FieldsConflictsResponse {
  conflicts: FieldConflict[];
}

export const schemaFieldsConflictsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/schema/fields_conflicts',
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
  handler: async ({ params, request, getScopedClients }): Promise<FieldsConflictsResponse> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot read stream ${params.path.name}, insufficient privileges`);
    }

    // Get the stream definition to check if it's a wired stream
    const streamDefinition = await streamsClient.getStream(params.path.name);

    // Only check conflicts for wired streams - classic streams don't need this
    if (!Streams.WiredStream.Definition.is(streamDefinition)) {
      return { conflicts: [] };
    }

    const userFieldDefinitions = params.body.field_definitions.filter(
      (field) => field.type !== 'system'
    );

    if (userFieldDefinitions.length === 0) {
      return { conflicts: [] };
    }

    // Get the root stream name to limit conflict checking to the same tree
    const rootStreamName = getRoot(params.path.name);

    // Get all wired streams in the same tree (getDescendants already returns only wired streams)
    const treeStreams = await streamsClient.getDescendants(rootStreamName);

    // Build a map of fieldName -> [{streamName, type}] for all non-excluded streams
    const fieldMap = new Map<string, Array<{ streamName: string; type: string }>>();

    for (const stream of treeStreams) {
      // Skip the current stream and its descendants
      if (stream.name === params.path.name || isDescendantOf(params.path.name, stream.name)) {
        continue;
      }

      const fields = stream.ingest.wired.fields;

      for (const [fieldName, config] of Object.entries(fields)) {
        // Skip system fields
        if (config.type === 'system') {
          continue;
        }

        const existing = fieldMap.get(fieldName) || [];
        existing.push({ streamName: stream.name, type: config.type });
        fieldMap.set(fieldName, existing);
      }
    }

    // Find conflicts: proposed fields with same name but different type
    const conflicts: FieldConflict[] = [];

    for (const proposedField of userFieldDefinitions) {
      const existingFields = fieldMap.get(proposedField.name);

      if (!existingFields) {
        continue;
      }

      const conflictingStreams = existingFields
        .filter((existing) => existing.type !== proposedField.type)
        .map((existing) => ({
          streamName: existing.streamName,
          existingType: existing.type,
        }));

      if (conflictingStreams.length > 0) {
        conflicts.push({
          fieldName: proposedField.name,
          proposedType: proposedField.type,
          conflictingStreams,
        });
      }
    }

    return { conflicts };
  },
});

export const internalSchemaRoutes = {
  ...unmappedFieldsRoute,
  ...schemaFieldsSimulationRoute,
  ...schemaFieldsConflictsRoute,
};

const DUMMY_PIPELINE_NAME = '__dummy_pipeline__';

async function simulateIngest(
  sampleResultsAsSimulationDocs: Array<SearchHit<unknown>>,
  dataStreamName: string,
  propertiesForSimulation: StreamsMappingProperties,
  scopedClusterClient: IScopedClusterClient,
  streamDefinition: Streams.all.Definition
): Promise<SimulateIngestResult> {
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

  // TODO: We should be using scopedClusterClient.asCurrentUser.simulate.ingest() but the ES JS lib currently has a bug.
  const simulation = (await scopedClusterClient.asCurrentUser.transport.request({
    method: 'POST',
    path: simulatePath,
    body: simulationBody,
  })) as SimulateIngestResult;

  return simulation;
}
