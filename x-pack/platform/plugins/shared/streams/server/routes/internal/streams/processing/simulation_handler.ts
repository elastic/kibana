/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { errors as esErrors } from '@elastic/elasticsearch';
import type {
  IngestDocument,
  IngestProcessorContainer,
  IngestSimulateRequest,
  IngestPipelineProcessorResult,
  IngestSimulateDocumentResult,
  SimulateIngestRequest,
  IndicesIndexState,
  SimulateIngestResponse,
  SimulateIngestSimulateIngestDocumentResult,
  FieldCapsResponse,
  IngestSimulateResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { flattenObjectNestedLast, calculateObjectDiff } from '@kbn/object-utils';
import type {
  FlattenRecord,
  NamedFieldDefinitionConfig,
  FieldDefinition,
  SimulationError,
  DocSimulationStatus,
  SimulationDocReport,
  ProcessorMetrics,
  DetectedField,
  ProcessingSimulationResponse,
} from '@kbn/streams-schema';
import { getInheritedFieldsFromAncestors, isOtelStream, Streams } from '@kbn/streams-schema';
import { mapValues, uniq, omit, isEmpty, uniqBy } from 'lodash';
import type { StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline } from '@kbn/streamlang';
import { getRoot } from '@kbn/streams-schema/src/shared/hierarchy';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { FIELD_DEFINITION_TYPES } from '@kbn/streams-schema/src/fields';
import {
  normalizeGeoPointsInObject,
  detectGeoPointPatternsFromDocuments,
} from '../../../../lib/streams/helpers/normalize_geo_points';
import { getProcessingPipelineName } from '../../../../lib/streams/ingest_pipelines/name';
import type { StreamsClient } from '../../../../lib/streams/client';

export interface ProcessingSimulationParams {
  path: {
    name: string;
  };
  body: {
    processing: StreamlangDSL;
    documents: FlattenRecord[];
    detected_fields?: NamedFieldDefinitionConfig[];
  };
}

export interface SimulateProcessingDeps {
  params: ProcessingSimulationParams;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
}

// Narrow down the type to only successful processor results
export type SuccessfulPipelineSimulateDocumentResult = WithRequired<
  IngestSimulateDocumentResult,
  'processor_results'
>;

export interface SuccessfulPipelineSimulateResponse {
  docs: SuccessfulPipelineSimulateDocumentResult[];
}

export type PipelineSimulationResult =
  | {
      status: 'success';
      simulation: SuccessfulPipelineSimulateResponse;
    }
  | {
      status: 'failure';
      error: SimulationError;
    };

export type IngestSimulationResult =
  | {
      status: 'success';
      simulation: SimulateIngestResponse;
    }
  | {
      status: 'failure';
      error: SimulationError;
    };

export type WithRequired<TObj, TKey extends keyof TObj> = TObj & { [TProp in TKey]-?: TObj[TProp] };

export const simulateProcessing = async ({
  params,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
}: SimulateProcessingDeps): Promise<ProcessingSimulationResponse> => {
  /* 0. Retrieve required data to prepare the simulation */
  const [stream, { indexState: streamIndexState, fieldCaps: streamIndexFieldCaps }] =
    await Promise.all([
      streamsClient.getStream(params.path.name),
      getStreamIndex(scopedClusterClient, streamsClient, params.path.name),
    ]);

  const streamFields = await getStreamFields(streamsClient, stream);

  /* 1. Prepare data for either simulation types (ingest, pipeline), prepare simulation body for the mandatory pipeline simulation */
  const simulationData = prepareSimulationData(params, stream, streamFields);
  const pipelineSimulationBody = preparePipelineSimulationBody(simulationData);
  const ingestSimulationBody = prepareIngestSimulationBody(
    simulationData,
    stream,
    streamIndexState,
    params
  );
  /**
   * 2. Run both pipeline and ingest simulations in parallel.
   * - The pipeline simulation is used to extract the documents reports and the processor metrics. This always runs.
   * - The ingest simulation is used to fail fast on mapping failures. This runs only if `detected_fields` is provided.
   */
  const [pipelineSimulationResult, ingestSimulationResult] = await Promise.all([
    executePipelineSimulation(scopedClusterClient, pipelineSimulationBody),
    executeIngestSimulation(scopedClusterClient, ingestSimulationBody),
  ]);

  /* 3. Fail fast on pipeline simulations errors and return the generic error response gracefully */
  if (pipelineSimulationResult.status === 'failure') {
    return prepareSimulationFailureResponse(pipelineSimulationResult.error);
  } else if (ingestSimulationResult.status === 'failure') {
    return prepareSimulationFailureResponse(ingestSimulationResult.error);
  }

  const otelStream = isOtelStream(stream);

  /* 4. Extract all the documents reports and processor metrics from the simulations */
  const { docReports, processorsMetrics } = computePipelineSimulationResult(
    pipelineSimulationResult.simulation,
    ingestSimulationResult.simulation,
    simulationData.docs,
    params.body.processing,
    Streams.WiredStream.Definition.is(stream),
    otelStream,
    streamFields
  );

  /* 5. Extract valid detected fields with intelligent type suggestions from fieldsMetadataService */
  const detectedFields = await computeDetectedFields(
    processorsMetrics,
    params,
    streamFields,
    streamIndexFieldCaps,
    fieldsMetadataClient
  );

  /* 6. Derive general insights and process final response body */
  return prepareSimulationResponse(docReports, processorsMetrics, detectedFields);
};

const prepareSimulationDocs = (
  documents: FlattenRecord[],
  streamName: string,
  geoPointFields: Set<string>
): IngestDocument[] => {
  return documents.map((doc, id) => ({
    _index: streamName,
    _id: id.toString(),
    _source: normalizeGeoPointsInObject(doc, geoPointFields),
  }));
};

const prepareSimulationProcessors = (processing: StreamlangDSL): IngestProcessorContainer[] => {
  //
  /**
   * We want to simulate processors logic and collect data independently from the user config for simulation purposes.
   * 1. Force each processor to not ignore failures to collect all errors
   * 2. Append the error message to the `_errors` field on failure
   */
  const transpiledIngestPipelineProcessors = transpileIngestPipeline(processing, {
    ignoreMalformed: true,
    traceCustomIdentifiers: true,
  }).processors;

  return transpiledIngestPipelineProcessors.map((processor) => {
    const type = Object.keys(processor)[0];
    const processorConfig = (processor as any)[type]; // Safe to use any here due to type structure

    return {
      [type]: {
        ...processorConfig,
        ignore_failure: false,
        on_failure: [
          {
            append: {
              field: '_errors',
              value: {
                message: '{{{ _ingest.on_failure_message }}}',
                processor_id: processorConfig.tag,
                type: 'generic_processor_failure',
              },
            },
          },
        ],
      },
    };
  });
};

const prepareSimulationData = (
  params: ProcessingSimulationParams,
  stream: Streams.all.Definition,
  streamFields: FieldDefinition
) => {
  const { body } = params;
  const { processing, documents } = body;

  const targetStreamName = Streams.WiredStream.Definition.is(stream)
    ? getRoot(stream.name)
    : stream.name;

  const geoPointFieldsFromDefinition = new Set(
    Object.entries(streamFields)
      .filter(([, def]) => def.type === 'geo_point')
      .map(([name]) => name)
  );

  const geoPointFields =
    Streams.ClassicStream.Definition.is(stream) && documents.length > 0
      ? new Set([
          ...geoPointFieldsFromDefinition,
          ...detectGeoPointPatternsFromDocuments(documents),
        ])
      : geoPointFieldsFromDefinition;

  return {
    docs: prepareSimulationDocs(documents, targetStreamName, geoPointFields),
    processors: prepareSimulationProcessors(processing),
  };
};

const preparePipelineSimulationBody = (
  simulationData: ReturnType<typeof prepareSimulationData>
): IngestSimulateRequest => {
  const { docs, processors } = simulationData;

  return {
    docs,
    pipeline: { processors, field_access_pattern: 'flexible' },
    verbose: true,
  };
};

const prepareIngestSimulationBody = (
  simulationData: ReturnType<typeof prepareSimulationData>,
  stream: Streams.all.Definition,
  streamIndex: IndicesIndexState,
  params: ProcessingSimulationParams
): SimulateIngestRequest => {
  const { body } = params;
  const { detected_fields } = body;

  const { docs, processors } = simulationData;

  const defaultPipelineName = streamIndex.settings?.index?.default_pipeline;

  const pipelineSubstitutions: SimulateIngestRequest['pipeline_substitutions'] = {};

  if (defaultPipelineName) {
    pipelineSubstitutions[defaultPipelineName] = {
      processors,
      field_access_pattern: 'flexible',
    };
  }
  if (Streams.WiredStream.Definition.is(stream)) {
    // need to reroute from the root
    pipelineSubstitutions[getProcessingPipelineName(getRoot(stream.name))] = {
      processors: [
        {
          reroute: {
            destination: stream.name,
          },
        },
      ],
    };
  }

  const simulationBody: SimulateIngestRequest = {
    docs,
    pipeline_substitutions: pipelineSubstitutions,
    // Ideally we should not need to retrieve and merge the mappings from the stream index.
    // But the ingest simulation API does not validate correctly the mappings unless they are specified in the simulation body.
    // So we need to merge the mappings from the stream index with the detected fields.
    // This is a workaround until the ingest simulation API works as expected.
    ...(detected_fields && {
      mapping_addition: {
        properties: computeMappingProperties(detected_fields),
      },
    }),
  };

  return simulationBody;
};

/**
 * When running a pipeline simulation, we want to fail fast on syntax failures, such as grok patterns.
 * If the simulation fails, we won't be able to extract the documents reports and the processor metrics.
 * In case any other error occurs, we delegate the error handling to currently in draft processor.
 */
export const executePipelineSimulation = async (
  scopedClusterClient: IScopedClusterClient,
  simulationBody: IngestSimulateRequest
): Promise<PipelineSimulationResult> => {
  try {
    const originalSimulation = await scopedClusterClient.asCurrentUser.ingest.simulate(
      simulationBody
    );
    const simulation = sanitiseSimulationResult(originalSimulation);
    return {
      status: 'success',
      simulation: simulation as SuccessfulPipelineSimulateResponse,
    };
  } catch (error) {
    if (error instanceof esErrors.ResponseError) {
      const { processor_tag } = error.body?.error;

      return {
        status: 'failure',
        error: {
          message: error.message,
          processor_id: processor_tag,
          type: 'generic_simulation_failure',
        },
      };
    }

    return {
      status: 'failure',
      error: {
        message: error.message,
        type: 'generic_simulation_failure',
      },
    };
  }
};

// When dealing with a manual_ingest_pipeline action it is possible to have nested pipelines in the configuration,
// as in, using the actual pipeline processor type. The problem is these results are a little bit different, e.g:
// {
//   "processor_type": "pipeline",
//   "status": "success",
//   "tag": "id5ded880-a555-11f0-94f6-45fc383ca38e",
//   "if": {
//     "condition": "ctx['data_stream.type'] == 'logs'",
//     "result": true
//   }
// },
// {
//   "processor_type": "set",
//   "status": "success",
//   "doc": {
//     "_index": "logs-synth-default",
//     "_version": "-3",
//     "_id": "99",
//     "_source": {
//       "host.name": test,
//     },
//   "_ingest": {
//     "pipeline": "network_subpipeline",
//     "timestamp": "2025-10-09T23:40:40.710774Z"
//   }
// }
// We use sanitiseSimulationResult and propagateProcessorResultsPipelineTags to
// propagate the pipeline processor tag (taken from the manual_ingest_pipeline action) to all nested
// pipeline processor results.
const sanitiseSimulationResult = (simulationResult: IngestSimulateResponse) => {
  return {
    docs: simulationResult.docs.map((doc) => {
      return {
        ...doc,
        processor_results: propagateProcessorResultsPipelineTags(doc.processor_results)?.filter(
          (result) => {
            return result.processor_type !== 'pipeline';
          }
        ),
      };
    }),
  };
};

function propagateProcessorResultsPipelineTags(
  processorResults: IngestSimulateDocumentResult['processor_results']
): IngestSimulateDocumentResult['processor_results'] {
  if (!processorResults) return undefined;

  let lastPipelineTag: string | undefined;
  let applyTag = false;

  return processorResults.map((result) => {
    // If this is a pipeline processor, store its tag and start applying
    if (result.processor_type === 'pipeline' && result.tag) {
      lastPipelineTag = result.tag;
      applyTag = true;
      return result;
    }

    // If 1. we should apply the tag 2. this result is not from the root simulated pipeline 3. has no tag set
    if (applyTag && !result.tag && result.doc?._ingest?.pipeline !== '_simulate_pipeline') {
      // Apply the last pipeline tag
      return { ...result, tag: lastPipelineTag };
    }

    // If this result has its own tag, stop applying the pipeline tag
    if (result.tag) {
      applyTag = false;
    }

    return result;
  });
}

const executeIngestSimulation = async (
  scopedClusterClient: IScopedClusterClient,
  simulationBody: SimulateIngestRequest
): Promise<IngestSimulationResult> => {
  try {
    const simulation = await scopedClusterClient.asCurrentUser.simulate.ingest(simulationBody);

    return {
      status: 'success',
      simulation: simulation as SimulateIngestResponse,
    };
  } catch (error) {
    if (error instanceof esErrors.ResponseError) {
      const { processor_tag, reason } = error.body?.error;

      return {
        status: 'failure',
        error: {
          message: reason,
          processor_id: processor_tag,
          type: 'generic_simulation_failure',
        },
      };
    }

    return {
      status: 'failure',
      error: {
        message: error.message,
        type: 'generic_simulation_failure',
      },
    };
  }
};

/**
 * Computing simulation insights for each document and processor takes a few steps:
 * 1. Extract the last document source and the status of the simulation.
 * 2. Compute the diff between the sample document and the simulation document to detect fields changes.
 * 3. Track the detected fields and errors for each processor.
 *
 * To keep this process at the O(n) complexity, we iterate over the documents and processors only once.
 * This requires a closure on the processor metrics map to keep track of the processor state while iterating over the documents.
 */
const computePipelineSimulationResult = (
  pipelineSimulationResult: SuccessfulPipelineSimulateResponse,
  ingestSimulationResult: SimulateIngestResponse,
  sampleDocs: Array<{ _source: FlattenRecord }>,
  processing: StreamlangDSL,
  isWiredStream: boolean,
  otelStream: boolean,
  streamFields: FieldDefinition
): {
  docReports: SimulationDocReport[];
  processorsMetrics: Record<string, ProcessorMetrics>;
} => {
  const transpiledProcessors = transpileIngestPipeline(processing, {
    ignoreMalformed: true,
    traceCustomIdentifiers: true,
  }).processors;

  const processorsMap = initProcessorMetricsMap(transpiledProcessors);

  const forbiddenFields = Object.entries(streamFields)
    .filter(([, { type }]) => type === 'system')
    .map(([name]) => name);

  const docReports = pipelineSimulationResult.docs.map((pipelineDocResult, id) => {
    const ingestDocResult = ingestSimulationResult.docs[id];
    const ingestDocErrors = collectIngestDocumentErrors(ingestDocResult, otelStream);
    const processedBy = collectProcessedByProcessorIds(pipelineDocResult.processor_results);

    const { errors, status, value } = getLastDoc(
      pipelineDocResult,
      sampleDocs[id]._source,
      ingestDocErrors
    );

    const diff = computeSimulationDocDiff(
      sampleDocs[id]._source,
      pipelineDocResult,
      isWiredStream,
      forbiddenFields
    );

    pipelineDocResult.processor_results.forEach((processor) => {
      const procId = processor.tag;

      if (procId && isSkippedProcessor(processor)) {
        processorsMap[procId].skipped_rate++;
      }

      if (procId && isDroppedProcessor(processor)) {
        processorsMap[procId].dropped_rate++;
      }
    });

    diff.detected_fields.forEach(({ processor_id, name }) => {
      processorsMap[processor_id].detected_fields.push(name);
    });

    errors.push(...diff.errors); // Add diffing errors to the document errors list, such as reserved fields
    errors.push(...ingestDocErrors); // Add ingestion errors to the document errors list, such as ignored_fields or mapping errors
    errors.forEach((error) => {
      const procId = 'processor_id' in error && error.processor_id;

      if (procId && processorsMap[procId]) {
        processorsMap[procId].errors.push(error);
        processorsMap[procId].failed_rate++;
      }
    });

    return {
      detected_fields: diff.detected_fields,
      errors,
      processed_by: processedBy,
      status,
      value,
    };
  });

  const processorsMetrics = extractProcessorMetrics({
    processorsMap,
    sampleSize: docReports.length,
  });

  return { docReports, processorsMetrics };
};

const initProcessorMetricsMap = (
  processors: IngestProcessorContainer[]
): Record<string, ProcessorMetrics> => {
  // Gather unique IDs because the manual ingest pipeline proccessor (for example) will share the same
  // ID across it's nested processors.
  const ids = new Set<string>();

  for (const processor of processors) {
    const type = Object.keys(processor)[0] as keyof IngestProcessorContainer;
    const config = processor[type] as Record<string, unknown>;
    const tag = config.tag;

    if (typeof tag === 'string') {
      ids.add(tag);
    }
  }

  const uniqueIds = Array.from(ids);

  const processorMetricsEntries = uniqueIds.map((id) => [
    id,
    {
      detected_fields: [],
      errors: [],
      failed_rate: 0,
      skipped_rate: 0,
      parsed_rate: 1,
      dropped_rate: 0,
    },
  ]);

  return Object.fromEntries(processorMetricsEntries);
};

const extractProcessorMetrics = ({
  processorsMap,
  sampleSize,
}: {
  processorsMap: Record<string, ProcessorMetrics>;
  sampleSize: number;
}) => {
  return mapValues(processorsMap, (metrics) => {
    const failureRate = metrics.failed_rate / sampleSize;
    const skippedRate = metrics.skipped_rate / sampleSize;
    const parsedRate = 1 - skippedRate - failureRate;
    const droppedRate = metrics.dropped_rate / sampleSize;
    const detected_fields = uniq(metrics.detected_fields);
    const errors = uniqBy(metrics.errors, (error) => error.message);

    return {
      detected_fields,
      errors,
      failed_rate: parseFloat(failureRate.toFixed(3)),
      skipped_rate: parseFloat(skippedRate.toFixed(3)),
      parsed_rate: parseFloat(parsedRate.toFixed(3)),
      dropped_rate: parseFloat(droppedRate.toFixed(3)),
    };
  });
};

const getDocumentStatus = (
  doc: SuccessfulPipelineSimulateDocumentResult,
  ingestDocErrors: SimulationError[]
): DocSimulationStatus => {
  // If there is an ingestion mapping error, the document parsing should be considered failed
  if (ingestDocErrors.some((error) => error.type === 'field_mapping_failure')) {
    return 'failed';
  }
  const processorResults = doc.processor_results;

  if (processorResults.every(isSkippedProcessor)) {
    return 'skipped';
  }

  // If any processor dropped the document, it should be considered dropped
  // (even if other processors succeeded before the drop)
  if (processorResults.some(isDroppedProcessor)) {
    return 'dropped';
  }

  if (processorResults.every((proc) => isSuccessfulProcessor(proc) || isSkippedProcessor(proc))) {
    return 'parsed';
  }

  if (processorResults.some(isSuccessfulProcessor)) {
    return 'partially_parsed';
  }

  return 'failed';
};

const getLastDoc = (
  docResult: SuccessfulPipelineSimulateDocumentResult,
  sample: FlattenRecord,
  ingestDocErrors: SimulationError[]
) => {
  const status = getDocumentStatus(docResult, ingestDocErrors);
  const lastDocSource =
    docResult.processor_results.filter((proc) => !isSkippedProcessor(proc)).at(-1)?.doc?._source ??
    sample;

  if (status === 'parsed') {
    return {
      value: flattenObjectNestedLast(lastDocSource),
      errors: [] as SimulationError[],
      status,
    };
  } else {
    const { _errors = [], ...value } = lastDocSource;
    return { value: flattenObjectNestedLast(value), errors: _errors as SimulationError[], status };
  }
};

/**
 * To improve tracking down the errors and the fields detection to the individual processor,
 * this function computes the detected fields and the errors for each processor.
 */
const computeSimulationDocDiff = (
  base: FlattenRecord,
  docResult: SuccessfulPipelineSimulateDocumentResult,
  isWiredStream: boolean,
  forbiddenFields: string[]
) => {
  // Keep only the successful processors defined from the user, skipping the on_failure processors from the simulation
  const successfulProcessors = docResult.processor_results.filter(isSuccessfulProcessor);

  const comparisonDocs = [
    { processor_id: 'base', value: base },
    ...successfulProcessors.map((proc) => {
      return {
        processor_id: proc.tag,
        value: omit(proc.doc._source, ['_errors']),
      };
    }),
  ];

  const diffResult: Pick<SimulationDocReport, 'detected_fields' | 'errors'> = {
    detected_fields: [],
    errors: [],
  };

  // Compare each document outcome with the previous one, flattening for standard comparison and detecting added/udpated fields.
  // When updated fields are detected compared to the original document, the processor is not additive to the documents, and an error is added to the diff result.
  while (comparisonDocs.length > 1) {
    const currentDoc = comparisonDocs.shift()!; // Safe to use ! here since we check the length
    const nextDoc = comparisonDocs[0];

    const { added, updated } = calculateObjectDiff(
      flattenObjectNestedLast(currentDoc.value),
      flattenObjectNestedLast(nextDoc.value)
    );

    const addedFields = Object.keys(flattenObjectNestedLast(added));
    const updatedFields = Object.keys(flattenObjectNestedLast(updated));

    // Sort list to have deterministic list of results
    const processorDetectedFields = [...addedFields, ...updatedFields].sort().map((name) => ({
      processor_id: nextDoc.processor_id,
      name,
    }));

    diffResult.detected_fields.push(...processorDetectedFields);

    if (forbiddenFields.some((field) => updatedFields.includes(field))) {
      diffResult.errors.push({
        processor_id: nextDoc.processor_id,
        type: 'reserved_field_failure',
        message: `The processor is trying to update a reserved field [${forbiddenFields.join()}]`,
      });
    }
  }

  return diffResult;
};

const collectProcessedByProcessorIds = (
  processorResults: SuccessfulPipelineSimulateDocumentResult['processor_results']
) => {
  const processedBy = new Set<string>();

  processorResults.forEach((processor) => {
    if (!processor.tag || isSkippedProcessor(processor)) {
      return;
    }

    processedBy.add(processor.tag);
  });

  return Array.from(processedBy);
};

const collectIngestDocumentErrors = (
  docResult: SimulateIngestSimulateIngestDocumentResult,
  otelStream: boolean
) => {
  const errors: SimulationError[] = [];

  if (isMappingFailure(docResult)) {
    errors.push({
      type: 'field_mapping_failure',
      message: `Some field types might not be compatible with this document: ${docResult.doc?.error?.reason}`,
    });
  }

  if (docResult.doc?.ignored_fields) {
    // Drop ignored field errors for OTEL streams if they end in geo.location - This is a temporary workaround for https://github.com/elastic/elasticsearch/issues/140506
    const fieldsWithoutLocation = docResult.doc.ignored_fields.filter(({ field }) => {
      return !field.endsWith('geo.location');
    });
    if (otelStream && fieldsWithoutLocation.length === 0) {
      return errors;
    }
    errors.push({
      type: 'ignored_fields_failure',
      message: 'Some fields were ignored while simulating this document ingestion.',
      ignored_fields: fieldsWithoutLocation,
    });
  }

  return errors;
};

const prepareSimulationResponse = async (
  docReports: SimulationDocReport[],
  processorsMetrics: Record<string, ProcessorMetrics>,
  detectedFields: DetectedField[]
) => {
  const calculateRateByStatus = getRateCalculatorForDocs(docReports);

  const parsedRate = calculateRateByStatus('parsed');
  const partiallyParsedRate = calculateRateByStatus('partially_parsed');
  const skippedRate = calculateRateByStatus('skipped');
  const failureRate = calculateRateByStatus('failed');
  const droppedRate = calculateRateByStatus('dropped');

  return {
    detected_fields: detectedFields,
    documents: docReports,
    processors_metrics: processorsMetrics,
    definition_error: undefined,
    documents_metrics: {
      failed_rate: parseFloat(failureRate.toFixed(3)),
      partially_parsed_rate: parseFloat(partiallyParsedRate.toFixed(3)),
      skipped_rate: parseFloat(skippedRate.toFixed(3)),
      parsed_rate: parseFloat(parsedRate.toFixed(3)),
      dropped_rate: parseFloat(droppedRate.toFixed(3)),
    },
  };
};

const prepareSimulationFailureResponse = (error: SimulationError) => {
  const failedBecauseNoSampleDocs = error.message.includes('must specify at least one document');
  return {
    detected_fields: [],
    documents: [],
    processors_metrics: {
      ...('processor_id' in error &&
        error.processor_id && {
          [error.processor_id]: {
            detected_fields: [],
            errors: [error],
            failed_rate: 1,
            skipped_rate: 0,
            parsed_rate: 0,
            dropped_rate: 0,
          },
        }),
    },
    // failure to simulate is considered a definition error, which will be displayed prominently in the UI
    // The simulate API returns a generic error when no documents are provided, which is not useful in this context
    definition_error: !failedBecauseNoSampleDocs ? error : undefined,
    documents_metrics: {
      failed_rate: 1,
      partially_parsed_rate: 0,
      skipped_rate: 0,
      parsed_rate: 0,
      dropped_rate: 0,
    },
  };
};

const getStreamIndex = async (
  scopedClusterClient: IScopedClusterClient,
  streamsClient: StreamsClient,
  streamName: string
): Promise<{
  indexState: IndicesIndexState;
  fieldCaps: FieldCapsResponse['fields'];
}> => {
  const dataStream = await streamsClient.getDataStream(streamName);
  const lastIndexRef = dataStream.indices.at(-1);
  if (!lastIndexRef) {
    throw new Error(`No writing index found for stream ${streamName}`);
  }

  const [lastIndex, lastIndexFieldCaps] = await Promise.all([
    scopedClusterClient.asCurrentUser.indices.get({
      index: lastIndexRef.index_name,
    }),
    scopedClusterClient.asCurrentUser.fieldCaps({
      index: lastIndexRef.index_name,
      fields: '*',
    }),
  ]);

  return {
    indexState: lastIndex[lastIndexRef.index_name],
    fieldCaps: lastIndexFieldCaps.fields,
  };
};

const getStreamFields = async (
  streamsClient: StreamsClient,
  stream: Streams.all.Definition
): Promise<FieldDefinition> => {
  const ancestors = await streamsClient.getAncestors(stream.name);

  if (Streams.WiredStream.Definition.is(stream)) {
    return { ...stream.ingest.wired.fields, ...getInheritedFieldsFromAncestors(ancestors) };
  }

  if (Streams.ClassicStream.Definition.is(stream)) {
    return { ...stream.ingest.classic.field_overrides };
  }

  return {};
};

/**
 * In case new fields have been detected, we want to tell the user which ones are inherited and already mapped.
 */
const computeDetectedFields = async (
  processorsMetrics: Record<string, ProcessorMetrics>,
  params: ProcessingSimulationParams,
  streamFields: FieldDefinition,
  streamFieldCaps: FieldCapsResponse['fields'],
  fieldsMetadataClient: IFieldsMetadataClient
): Promise<DetectedField[]> => {
  const fields = Object.values(processorsMetrics).flatMap((metrics) => metrics.detected_fields);

  const uniqueFields = uniq(fields);

  // Short-circuit to avoid fetching streams fields if none is detected
  if (isEmpty(uniqueFields)) {
    return [];
  }

  const confirmedValidDetectedFields = computeMappingProperties(params.body.detected_fields ?? []);

  let fieldMetadataMap: Record<string, FieldMetadataPlain>;
  try {
    fieldMetadataMap = (
      await fieldsMetadataClient.find({
        fieldNames: uniqueFields,
      })
    ).toPlain();
  } catch (error) {
    // Gracefully handle metadata service failures
    fieldMetadataMap = {};
  }

  return uniqueFields.map((name) => {
    const existingField = streamFields[name];
    if (existingField) {
      return { name, ...existingField };
    }

    const existingFieldCaps = Object.keys(streamFieldCaps[name] || {});
    const esType = existingFieldCaps.length > 0 ? existingFieldCaps[0] : undefined;

    let suggestedType: string | undefined;
    let source: string | undefined;
    let description: string | undefined;

    const fieldMetadata = fieldMetadataMap[name];
    if (
      fieldMetadata &&
      fieldMetadata.type &&
      FIELD_DEFINITION_TYPES.includes(fieldMetadata.type as (typeof FIELD_DEFINITION_TYPES)[number])
    ) {
      suggestedType = fieldMetadata.type;
      source = fieldMetadata.source;
      description = fieldMetadata.description;
    }

    return {
      name,
      type: confirmedValidDetectedFields[name]?.type,
      esType,
      suggestedType,
      source,
      description,
    };
  });
};

const getRateCalculatorForDocs = (docs: SimulationDocReport[]) => (status: DocSimulationStatus) => {
  const matchCount = docs.reduce((rate, doc) => (rate += doc.status === status ? 1 : 0), 0);

  return matchCount / docs.length;
};

const computeMappingProperties = (detectedFields: NamedFieldDefinitionConfig[]) => {
  return Object.fromEntries(
    detectedFields.flatMap(({ name, ...config }) => {
      if (config.type === 'system') {
        return [];
      }
      return [[name, { ...config, ignore_malformed: false }]];
    })
  );
};

/**
 * Guard helpers
 */
const isSuccessfulProcessor = (
  processor: IngestPipelineProcessorResult
): processor is WithRequired<IngestPipelineProcessorResult, 'doc' | 'tag'> =>
  processor.status === 'success' && !!processor.tag;

const isSkippedProcessor = (
  processor: IngestPipelineProcessorResult
): processor is WithRequired<IngestPipelineProcessorResult, 'tag'> =>
  processor.status === 'skipped';

const isDroppedProcessor = (
  processor: IngestPipelineProcessorResult
): processor is WithRequired<IngestPipelineProcessorResult, 'tag'> =>
  processor.status === 'dropped';

const isMappingFailure = (entry: SimulateIngestSimulateIngestDocumentResult) =>
  entry.doc?.error?.type === 'document_parsing_exception';
