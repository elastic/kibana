/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { errors as esErrors } from '@elastic/elasticsearch';
import {
  IngestDocument,
  IngestProcessorContainer,
  IngestSimulateRequest,
  IngestPipelineSimulation,
  IngestSimulateDocumentResult,
  SimulateIngestRequest,
  IndicesIndexState,
  SimulateIngestResponse,
  SimulateIngestSimulateIngestDocumentResult,
  FieldCapsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';
import { flattenObjectNestedLast, calculateObjectDiff } from '@kbn/object-utils';
import {
  FlattenRecord,
  ProcessorDefinitionWithId,
  getProcessorType,
  ProcessorDefinition,
  getInheritedFieldsFromAncestors,
  NamedFieldDefinitionConfig,
  FieldDefinitionConfig,
  InheritedFieldDefinitionConfig,
  isNamespacedEcsField,
  FieldDefinition,
  Streams,
} from '@kbn/streams-schema';
import { mapValues, uniq, omit, isEmpty, uniqBy, some } from 'lodash';
import { StreamsClient } from '../../../../lib/streams/client';
import { formatToIngestProcessors } from '../../../../lib/streams/helpers/processing';

export interface ProcessingSimulationParams {
  path: {
    name: string;
  };
  body: {
    processing: ProcessorDefinitionWithId[];
    documents: FlattenRecord[];
    detected_fields?: NamedFieldDefinitionConfig[];
  };
}

export interface SimulateProcessingDeps {
  params: ProcessingSimulationParams;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
}

export interface BaseSimulationError {
  message: string;
}

export type SimulationError = BaseSimulationError &
  (
    | {
        type: 'field_mapping_failure';
      }
    | {
        type: 'generic_processor_failure';
        processor_id: string;
      }
    | {
        type: 'generic_simulation_failure';
        processor_id?: string;
      }
    | {
        type: 'ignored_fields_failure';
        ignored_fields: Array<Record<string, string>>;
      }
    | {
        type: 'non_additive_processor_failure';
        processor_id: string;
      }
    | {
        type: 'non_namespaced_fields_failure';
        processor_id: string;
      }
    | {
        type: 'reserved_field_failure';
        processor_id: string;
      }
  );

export type DocSimulationStatus = 'parsed' | 'partially_parsed' | 'skipped' | 'failed';

export interface SimulationDocReport {
  detected_fields: Array<{ processor_id: string; name: string }>;
  errors: SimulationError[];
  status: DocSimulationStatus;
  value: FlattenRecord;
}

export interface ProcessorMetrics {
  detected_fields: string[];
  errors: SimulationError[];
  failed_rate: number;
  skipped_rate: number;
  parsed_rate: number;
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

export type DetectedField =
  | WithNameAndEsType
  | WithNameAndEsType<FieldDefinitionConfig | InheritedFieldDefinitionConfig>;

export type WithNameAndEsType<TObj = {}> = TObj & { name: string; esType?: string };
export type WithRequired<TObj, TKey extends keyof TObj> = TObj & { [TProp in TKey]-?: TObj[TProp] };

export const simulateProcessing = async ({
  params,
  scopedClusterClient,
  streamsClient,
}: SimulateProcessingDeps) => {
  /* 0. Retrieve required data to prepare the simulation */
  const [stream, { indexState: streamIndexState, fieldCaps: streamIndexFieldCaps }] =
    await Promise.all([
      streamsClient.getStream(params.path.name),
      getStreamIndex(scopedClusterClient, streamsClient, params.path.name),
    ]);

  /* 1. Prepare data for either simulation types (ingest, pipeline), prepare simulation body for the mandatory pipeline simulation */
  const simulationData = prepareSimulationData(params);
  const pipelineSimulationBody = preparePipelineSimulationBody(simulationData);
  const ingestSimulationBody = prepareIngestSimulationBody(
    simulationData,
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

  const streamFields = await getStreamFields(streamsClient, params.path.name);

  /* 4. Extract all the documents reports and processor metrics from the simulations */
  const { docReports, processorsMetrics } = computePipelineSimulationResult(
    pipelineSimulationResult.simulation,
    ingestSimulationResult.simulation,
    simulationData.docs,
    params.body.processing,
    Streams.WiredStream.Definition.is(stream),
    streamFields
  );

  /* 5. Extract valid detected fields asserting existing mapped fields from stream and ancestors */
  const detectedFields = await computeDetectedFields(
    processorsMetrics,
    params,
    streamFields,
    streamIndexFieldCaps
  );

  /* 6. Derive general insights and process final response body */
  return prepareSimulationResponse(docReports, processorsMetrics, detectedFields);
};

const prepareSimulationDocs = (
  documents: FlattenRecord[],
  streamName: string
): IngestDocument[] => {
  return documents.map((doc, id) => ({
    _index: streamName,
    _id: id.toString(),
    _source: doc,
  }));
};

const prepareSimulationProcessors = (
  processing: ProcessorDefinitionWithId[]
): IngestProcessorContainer[] => {
  //
  /**
   * We want to simulate processors logic and collect data indipendently from the user config for simulation purposes.
   * 1. Force each processor to not ignore failures to collect all errors
   * 2. Append the error message to the `_errors` field on failure
   */
  const processors = processing.map((processor) => {
    const { id, ...processorConfig } = processor;

    const type = getProcessorType(processorConfig);
    return {
      [type]: {
        ...(processorConfig as any)[type], // Safe to use any here due to type structure
        ignore_failure: false,
        tag: id,
        on_failure: [
          {
            append: {
              field: '_errors',
              value: {
                message: '{{{ _ingest.on_failure_message }}}',
                processor_id: '{{{ _ingest.on_failure_processor_tag }}}',
                type: 'generic_processor_failure',
              },
            },
          },
        ],
      },
    } as ProcessorDefinition;
  });

  const dotExpanderProcessors: Array<Pick<IngestProcessorContainer, 'dot_expander'>> = [
    {
      dot_expander: {
        field: '*',
        ignore_failure: true,
        override: true,
      },
    },
    {
      dot_expander: {
        path: 'resource.attributes',
        field: '*',
        ignore_failure: true,
      },
    },
    {
      dot_expander: {
        path: 'attributes',
        field: '*',
        ignore_failure: true,
      },
    },
  ];

  const formattedProcessors = formatToIngestProcessors(processors, {
    ignoreMalformedManualIngestPipeline: true,
  });

  return [...dotExpanderProcessors, ...formattedProcessors];
};

const prepareSimulationData = (params: ProcessingSimulationParams) => {
  const { path, body } = params;
  const { processing, documents } = body;

  return {
    docs: prepareSimulationDocs(documents, path.name),
    processors: prepareSimulationProcessors(processing),
  };
};

const preparePipelineSimulationBody = (
  simulationData: ReturnType<typeof prepareSimulationData>
): IngestSimulateRequest => {
  const { docs, processors } = simulationData;

  return {
    docs,
    pipeline: { processors },
    verbose: true,
  };
};

const prepareIngestSimulationBody = (
  simulationData: ReturnType<typeof prepareSimulationData>,
  streamIndex: IndicesIndexState,
  params: ProcessingSimulationParams
): SimulateIngestRequest => {
  const { body } = params;
  const { detected_fields } = body;

  const { docs, processors } = simulationData;

  const defaultPipelineName = streamIndex.settings?.index?.default_pipeline;
  const mappings = streamIndex.mappings;

  const simulationBody: SimulateIngestRequest = {
    docs,
    ...(defaultPipelineName && {
      pipeline_substitutions: {
        [defaultPipelineName]: {
          processors,
        },
      },
    }),
    // Ideally we should not need to retrieve and merge the mappings from the stream index.
    // But the ingest simulation API does not validate correctly the mappings unless they are specified in the simulation body.
    // So we need to merge the mappings from the stream index with the detected fields.
    // This is a workaround until the ingest simulation API works as expected.
    mapping_addition: {
      ...mappings,
      properties: {
        ...(mappings && mappings.properties),
        ...(detected_fields && computeMappingProperties(detected_fields)),
      },
    },
  };

  return simulationBody;
};

/**
 * When running a pipeline simulation, we want to fail fast on syntax failures, such as grok patterns.
 * If the simulation fails, we won't be able to extract the documents reports and the processor metrics.
 * In case any other error occurs, we delegate the error handling to currently in draft processor.
 */
const executePipelineSimulation = async (
  scopedClusterClient: IScopedClusterClient,
  simulationBody: IngestSimulateRequest
): Promise<PipelineSimulationResult> => {
  try {
    const simulation = await scopedClusterClient.asCurrentUser.ingest.simulate(simulationBody);

    return {
      status: 'success',
      simulation: simulation as SuccessfulPipelineSimulateResponse,
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
 * 2. Compute the diff between the sample document and the simulation document to detect added fields and non-additive changes.
 * 3. Track the detected fields and errors for each processor.
 *
 * To keep this process at the O(n) complexity, we iterate over the documents and processors only once.
 * This requires a closure on the processor metrics map to keep track of the processor state while iterating over the documents.
 */
const computePipelineSimulationResult = (
  pipelineSimulationResult: SuccessfulPipelineSimulateResponse,
  ingestSimulationResult: SimulateIngestResponse,
  sampleDocs: Array<{ _source: FlattenRecord }>,
  processing: ProcessorDefinitionWithId[],
  isWiredStream: boolean,
  streamFields: FieldDefinition
): {
  docReports: SimulationDocReport[];
  processorsMetrics: Record<string, ProcessorMetrics>;
} => {
  const processorsMap = initProcessorMetricsMap(processing);

  const forbiddenFields = Object.entries(streamFields)
    .filter(([, { type }]) => type === 'system')
    .map(([name]) => name);

  const docReports = pipelineSimulationResult.docs.map((pipelineDocResult, id) => {
    const ingestDocResult = ingestSimulationResult.docs[id];
    const ingestDocErrors = collectIngestDocumentErrors(ingestDocResult);

    const { errors, status, value } = getLastDoc(
      pipelineDocResult,
      sampleDocs[id]._source,
      ingestDocErrors
    );

    const diff = computeSimulationDocDiff(
      pipelineDocResult,
      sampleDocs[id]._source,
      isWiredStream,
      forbiddenFields
    );

    pipelineDocResult.processor_results.forEach((processor) => {
      const procId = processor.tag;

      if (procId && isSkippedProcessor(processor)) {
        processorsMap[procId].skipped_rate++;
      }
    });

    diff.detected_fields.forEach(({ processor_id, name }) => {
      processorsMap[processor_id].detected_fields.push(name);
    });

    errors.push(...diff.errors); // Add diffing errors to the document errors list, such as reserved fields or non-additive changes
    errors.push(...ingestDocErrors); // Add ingestion errors to the document errors list, such as ignored_fields or mapping errors
    errors.forEach((error) => {
      const procId = 'processor_id' in error && error.processor_id;

      if (procId && processorsMap[procId]) {
        processorsMap[procId].errors.push(error);
        if (error.type !== 'non_additive_processor_failure') {
          processorsMap[procId].failed_rate++;
        }
      }
    });

    return {
      detected_fields: diff.detected_fields,
      errors,
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
  processing: ProcessorDefinitionWithId[]
): Record<string, ProcessorMetrics> => {
  const processorMetricsEntries = processing.map((processor) => [
    processor.id,
    {
      detected_fields: [],
      errors: [],
      failed_rate: 0,
      skipped_rate: 0,
      parsed_rate: 1,
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
    const detected_fields = uniq(metrics.detected_fields);
    const errors = uniqBy(metrics.errors, (error) => error.message);

    return {
      detected_fields,
      errors,
      failed_rate: parseFloat(failureRate.toFixed(3)),
      skipped_rate: parseFloat(skippedRate.toFixed(3)),
      parsed_rate: parseFloat(parsedRate.toFixed(3)),
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
  // Remove the always present base processor for dot expanders
  const processorResults = doc.processor_results.slice(3);

  if (processorResults.every(isSkippedProcessor)) {
    return 'skipped';
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
    docResult.processor_results
      .slice(3) // Remove the always present base processors for dot expander
      .filter((proc) => !isSkippedProcessor(proc))
      .at(-1)?.doc?._source ?? sample;

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
 * Computing how a simulation document differs from the sample document is not enough
 * to determine if the processor fails on additive changes.
 * To improve tracking down the errors and the fields detection to the individual processor,
 * this function computes the detected fields and the errors for each processor.
 */
const computeSimulationDocDiff = (
  docResult: SuccessfulPipelineSimulateDocumentResult,
  sample: FlattenRecord,
  isWiredStream: boolean,
  forbiddenFields: string[]
) => {
  // Keep only the successful processors defined from the user, skipping the on_failure processors from the simulation
  const successfulProcessors = docResult.processor_results.filter(isSuccessfulProcessor);

  const comparisonDocs = [
    { processor_id: 'base', value: docResult.processor_results[0]!.doc!._source },
    ...successfulProcessors.map((proc) => ({
      processor_id: proc.tag,
      value: omit(proc.doc._source, ['_errors']),
    })),
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

    // We might have updated fields that are not present in the original document because are generated by the previous processors.
    // We exclude them from the list of fields that make the processor non-additive.
    const originalUpdatedFields = updatedFields
      .filter((field) => field in sample && !forbiddenFields.includes(field))
      .sort();
    if (isWiredStream) {
      const nonNamespacedFields = addedFields.filter((field) => !isNamespacedEcsField(field));
      if (!isEmpty(nonNamespacedFields)) {
        diffResult.errors.push({
          processor_id: nextDoc.processor_id,
          type: 'non_namespaced_fields_failure',
          message: `The fields generated by the processor are not namespaced ECS fields: [${nonNamespacedFields.join()}]`,
        });
      }
    }
    if (forbiddenFields.some((field) => updatedFields.includes(field))) {
      diffResult.errors.push({
        processor_id: nextDoc.processor_id,
        type: 'reserved_field_failure',
        message: `The processor is trying to update a reserved field [${forbiddenFields.join()}]`,
      });
    }
    if (!isEmpty(originalUpdatedFields)) {
      diffResult.errors.push({
        processor_id: nextDoc.processor_id,
        type: 'non_additive_processor_failure',
        message: `The processor is not additive to the documents. It might update fields [${originalUpdatedFields.join()}]`,
      });
    }
  }

  return diffResult;
};

const collectIngestDocumentErrors = (docResult: SimulateIngestSimulateIngestDocumentResult) => {
  const errors: SimulationError[] = [];

  if (isMappingFailure(docResult)) {
    errors.push({
      type: 'field_mapping_failure',
      message: `Some field types might not be compatible with this document: ${docResult.doc?.error?.reason}`,
    });
  }

  if (docResult.doc?.ignored_fields) {
    errors.push({
      type: 'ignored_fields_failure',
      message: 'Some fields were ignored while simulating this document ingestion.',
      ignored_fields: docResult.doc.ignored_fields,
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

  const isNotAdditiveSimulation = some(processorsMetrics, (metrics) =>
    metrics.errors.some(isNonAdditiveSimulationError)
  );

  return {
    detected_fields: detectedFields,
    documents: docReports,
    processors_metrics: processorsMetrics,
    documents_metrics: {
      failed_rate: parseFloat(failureRate.toFixed(3)),
      partially_parsed_rate: parseFloat(partiallyParsedRate.toFixed(3)),
      skipped_rate: parseFloat(skippedRate.toFixed(3)),
      parsed_rate: parseFloat(parsedRate.toFixed(3)),
    },
    is_non_additive_simulation: isNotAdditiveSimulation,
  };
};

const prepareSimulationFailureResponse = (error: SimulationError) => {
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
          },
        }),
    },
    documents_metrics: {
      failed_rate: 1,
      partially_parsed_rate: 0,
      skipped_rate: 0,
      parsed_rate: 0,
    },
    is_non_additive_simulation: isNonAdditiveSimulationError(error),
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
  streamName: string
): Promise<FieldDefinition> => {
  const [stream, ancestors] = await Promise.all([
    streamsClient.getStream(streamName),
    streamsClient.getAncestors(streamName),
  ]);

  if (Streams.WiredStream.Definition.is(stream)) {
    return { ...stream.ingest.wired.fields, ...getInheritedFieldsFromAncestors(ancestors) };
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
  streamFieldCaps: FieldCapsResponse['fields']
): Promise<DetectedField[]> => {
  const fields = Object.values(processorsMetrics).flatMap((metrics) => metrics.detected_fields);

  const uniqueFields = uniq(fields);

  // Short-circuit to avoid fetching streams fields if none is detected
  if (isEmpty(uniqueFields)) {
    return [];
  }

  const confirmedValidDetectedFields = computeMappingProperties(params.body.detected_fields ?? []);

  return uniqueFields.map((name) => {
    const existingField = streamFields[name];
    if (existingField) {
      return { name, ...existingField };
    }

    const existingFieldCaps = Object.keys(streamFieldCaps[name] || {});

    const esType = existingFieldCaps.length > 0 ? existingFieldCaps[0] : undefined;

    return { name, type: confirmedValidDetectedFields[name]?.type, esType };
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
      return [[name, config]];
    })
  );
};

/**
 * Guard helpers
 */
const isSuccessfulProcessor = (
  processor: IngestPipelineSimulation
): processor is WithRequired<IngestPipelineSimulation, 'doc' | 'tag'> =>
  processor.status === 'success' && !!processor.tag;

const isSkippedProcessor = (
  processor: IngestPipelineSimulation
): processor is WithRequired<IngestPipelineSimulation, 'tag'> =>
  // @ts-expect-error Looks like the IngestPipelineSimulation.status is not typed correctly and misses the 'skipped' status
  processor.status === 'skipped';

const isMappingFailure = (entry: SimulateIngestSimulateIngestDocumentResult) =>
  entry.doc?.error?.type === 'document_parsing_exception';

const isNonAdditiveSimulationError = (error: SimulationError) =>
  error.type === 'non_additive_processor_failure';
