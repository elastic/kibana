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
  IngestPipelineConfig,
  ClusterComponentTemplateNode,
  ErrorCauseKeys,
  IngestPipelineSimulation,
  IngestSimulateDocumentResult,
} from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';
import { flattenObjectNestedLast, calculateObjectDiff } from '@kbn/object-utils';
import {
  FlattenRecord,
  ProcessorDefinitionWithId,
  getProcessorType,
  ProcessorDefinition,
  isWiredStreamDefinition,
  getInheritedFieldsFromAncestors,
  NamedFieldDefinitionConfig,
  FieldDefinitionConfig,
  InheritedFieldDefinitionConfig,
} from '@kbn/streams-schema';
import { mapValues, uniq, omit, isEmpty, uniqBy, some } from 'lodash';
import { StreamsClient } from '../../../lib/streams/client';
import { DetectedMappingFailureError } from '../../../lib/streams/errors/detected_mapping_failure_error';
import { formatToIngestProcessors } from '../../../lib/streams/helpers/processing';

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

export interface SimulationError {
  message: string;
  processor_id: string;
  type:
    | 'generic_processor_failure'
    | 'generic_simulation_failure'
    | 'non_additive_processor_failure';
}

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
  failure_rate: number;
  skipped_rate: number;
  success_rate: number;
}

// Narrow down the type to only successful processor results
export type SuccessfulIngestSimulateDocumentResult = WithRequired<
  IngestSimulateDocumentResult,
  'processor_results'
>;

export interface SuccessfulIngestSimulateResponse {
  docs: SuccessfulIngestSimulateDocumentResult[];
}

export type PipelineSimulationResult =
  | {
      status: 'success';
      simulation: SuccessfulIngestSimulateResponse;
    }
  | {
      status: 'failure';
      error: SimulationError;
    };

export type DetectedField =
  | WithName
  | WithName<FieldDefinitionConfig | InheritedFieldDefinitionConfig>;

export type WithName<TObj = {}> = TObj & { name: string };
export type WithRequired<TObj, TKey extends keyof TObj> = TObj & { [TProp in TKey]-?: TObj[TProp] };

export const simulateProcessing = async ({
  params,
  scopedClusterClient,
  streamsClient,
}: SimulateProcessingDeps) => {
  /* 1. Prepare data for either simulation types (ingest, pipeline), prepare simulation body for the mandatory pipeline simulation */
  const simulationData = prepareSimulationData(params);
  const pipelineSimulationBody = preparePipelineSimulationBody(simulationData);
  /**
   * 2. Run both pipeline and ingest simulations in parallel.
   * - The pipeline simulation is used to extract the documents reports and the processor metrics. This always runs.
   * - The ingest simulation is used to fail fast on mapping failures. This runs only if `detected_fields` is provided.
   */
  const [pipelineSimulationResult] = await Promise.all([
    executePipelineSimulation(scopedClusterClient, pipelineSimulationBody),
    conditionallyExecuteIngestSimulation(scopedClusterClient, simulationData, params),
  ]);

  /* 3. Fail fast on pipeline simulation errors and return the generic error response gracefully */
  if (pipelineSimulationResult.status === 'failure') {
    return prepareSimulationFailureResponse(pipelineSimulationResult.error);
  }

  /* 4. Extract all the documents reports and processor metrics from the pipeline simulation */
  const { docReports, processorsMetrics } = computePipelineSimulationResult(
    pipelineSimulationResult.simulation,
    simulationData.docs,
    params.body.processing
  );

  /* 5. Extract valid detected fields asserting existing mapped fields from stream and ancestors */
  const detectedFields = await computeDetectedFields(processorsMetrics, streamsClient, params);

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

  const dotExpanderProcessor: Pick<IngestProcessorContainer, 'dot_expander'> = {
    dot_expander: {
      field: '*',
      override: true,
    },
  };

  const formattedProcessors = formatToIngestProcessors(processors);

  return [dotExpanderProcessor, ...formattedProcessors];
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
  params: ProcessingSimulationParams
) => {
  const { path, body } = params;
  const { detected_fields } = body;

  const { docs, processors } = simulationData;

  // TODO: update type once Kibana updates to elasticsearch-js 8.17
  const simulationBody: {
    docs: IngestDocument[];
    pipeline_substitutions: Record<string, IngestPipelineConfig>;
    component_template_substitutions?: Record<string, ClusterComponentTemplateNode>;
  } = {
    docs,
    pipeline_substitutions: {
      [`${path.name}@stream.processing`]: {
        processors,
      },
    },
  };

  if (detected_fields) {
    const properties = computeMappingProperties(detected_fields);
    simulationBody.component_template_substitutions = {
      [`${path.name}@stream.layer`]: {
        template: {
          mappings: {
            properties,
          },
        },
      },
    };
  }

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
      simulation: simulation as SuccessfulIngestSimulateResponse,
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
        processor_id: 'draft',
        type: 'generic_simulation_failure',
      },
    };
  }
};

// TODO: update type to built-in once Kibana updates to elasticsearch-js 8.17
interface IngestSimulationResult {
  docs: Array<{ doc: IngestDocument & { error?: ErrorCauseKeys } }>;
}

const conditionallyExecuteIngestSimulation = async (
  scopedClusterClient: IScopedClusterClient,
  simulationData: ReturnType<typeof prepareSimulationData>,
  params: ProcessingSimulationParams
): Promise<IngestSimulationResult | null> => {
  if (!params.body.detected_fields) return null;

  const simulationBody = prepareIngestSimulationBody(simulationData, params);

  let simulationResult: IngestSimulationResult;
  try {
    // TODO: We should be using scopedClusterClient.asCurrentUser.simulate.ingest() once Kibana updates to elasticsearch-js 8.17
    simulationResult = await scopedClusterClient.asCurrentUser.transport.request({
      method: 'POST',
      path: `_ingest/_simulate`,
      body: simulationBody,
    });
  } catch (error) {
    // To prevent a race condition on simulation erros, this return early and delegates the error handling to the pipeline simulation
    return null;
  }

  const entryWithError = simulationResult.docs.find(isMappingFailure);

  if (entryWithError) {
    throw new DetectedMappingFailureError(
      `The detected field types might not be compatible with these documents. ${entryWithError.doc.error?.reason}`
    );
  }

  return simulationResult;
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
  simulationResult: SuccessfulIngestSimulateResponse,
  sampleDocs: Array<{ _source: FlattenRecord }>,
  processing: ProcessorDefinitionWithId[]
): {
  docReports: SimulationDocReport[];
  processorsMetrics: Record<string, ProcessorMetrics>;
} => {
  const processorsMap = initProcessorMetricsMap(processing);

  const docReports = simulationResult.docs.map((docResult, id) => {
    const { errors, status, value } = getLastDoc(docResult, sampleDocs[id]._source);

    const diff = computeSimulationDocDiff(docResult, sampleDocs[id]._source);

    docResult.processor_results.forEach((processor) => {
      const procId = processor.tag;

      if (procId && isSkippedProcessor(processor)) {
        processorsMap[procId].skipped_rate++;
      }
    });

    diff.detected_fields.forEach(({ processor_id, name }) => {
      processorsMap[processor_id].detected_fields.push(name);
    });

    errors.push(...diff.errors);
    errors.forEach((error) => {
      const procId = error.processor_id;

      processorsMap[procId].errors.push(error);
      processorsMap[procId].failure_rate++;
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
      failure_rate: 0,
      skipped_rate: 0,
      success_rate: 1,
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
    const failureRate = metrics.failure_rate / sampleSize;
    const skippedRate = metrics.skipped_rate / sampleSize;
    const successRate = 1 - skippedRate - failureRate;
    const detected_fields = uniq(metrics.detected_fields);
    const errors = uniqBy(metrics.errors, (error) => error.message);

    return {
      detected_fields,
      errors,
      failure_rate: parseFloat(failureRate.toFixed(2)),
      skipped_rate: parseFloat(skippedRate.toFixed(2)),
      success_rate: parseFloat(successRate.toFixed(2)),
    };
  });
};

const getDocumentStatus = (doc: SuccessfulIngestSimulateDocumentResult): DocSimulationStatus => {
  // Remove the always present base processor for dot expander
  const processorResults = doc.processor_results.slice(1);

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

const getLastDoc = (docResult: SuccessfulIngestSimulateDocumentResult, sample: FlattenRecord) => {
  const status = getDocumentStatus(docResult);
  const lastDocSource =
    docResult.processor_results
      .slice(1) // Remove the always present base processor for dot expander
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
  docResult: SuccessfulIngestSimulateDocumentResult,
  sample: FlattenRecord
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
    const originalUpdatedFields = updatedFields.filter((field) => field in sample).sort();
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

const prepareSimulationResponse = async (
  docReports: SimulationDocReport[],
  processorsMetrics: Record<string, ProcessorMetrics>,
  detectedFields: DetectedField[]
) => {
  const successRate = computeSuccessRate(docReports);
  const skippedRate = computeSkippedRate(docReports);
  const failureRate = 1 - skippedRate - successRate;
  const isNotAdditiveSimulation = some(processorsMetrics, (metrics) =>
    metrics.errors.some(isNonAdditiveSimulationError)
  );

  return {
    detected_fields: detectedFields,
    documents: docReports,
    processors_metrics: processorsMetrics,
    failure_rate: parseFloat(failureRate.toFixed(2)),
    skipped_rate: parseFloat(skippedRate.toFixed(2)),
    success_rate: parseFloat(successRate.toFixed(2)),
    is_non_additive_simulation: isNotAdditiveSimulation,
  };
};

const prepareSimulationFailureResponse = (error: SimulationError) => {
  return {
    detected_fields: [],
    documents: [],
    processors_metrics: {
      [error.processor_id]: {
        detected_fields: [],
        errors: [error],
        failure_rate: 1,
        skipped_rate: 0,
        success_rate: 0,
      },
    },
    failure_rate: 1,
    skipped_rate: 0,
    success_rate: 0,
    is_non_additive_simulation: isNonAdditiveSimulationError(error),
  };
};

const getStreamFields = async (streamsClient: StreamsClient, streamName: string) => {
  const [stream, ancestors] = await Promise.all([
    streamsClient.getStream(streamName),
    streamsClient.getAncestors(streamName),
  ]);

  if (isWiredStreamDefinition(stream)) {
    return { ...stream.ingest.wired.fields, ...getInheritedFieldsFromAncestors(ancestors) };
  }

  return {};
};

/**
 * In case new fields have been detected, we want to tell the user which ones are inherited and already mapped.
 */
const computeDetectedFields = async (
  processorsMetrics: Record<string, ProcessorMetrics>,
  streamsClient: StreamsClient,
  params: ProcessingSimulationParams
): Promise<DetectedField[]> => {
  const streamName = params.path.name;
  const fields = Object.values(processorsMetrics).flatMap((metrics) => metrics.detected_fields);

  const uniqueFields = uniq(fields);

  // Short-circuit to avoid fetching streams fields if none is detected
  if (isEmpty(uniqueFields)) {
    return [];
  }

  const streamFields = await getStreamFields(streamsClient, streamName);
  const confirmedValidDetectedFields = computeMappingProperties(params.body.detected_fields ?? []);

  return uniqueFields.map((name) => {
    const existingField = streamFields[name];
    if (existingField) {
      return { name, ...existingField };
    }

    return { name, type: confirmedValidDetectedFields[name]?.type };
  });
};

const computeSuccessRate = (docs: SimulationDocReport[]) => {
  const successfulCount = docs.reduce((rate, doc) => (rate += doc.status === 'parsed' ? 1 : 0), 0);

  return successfulCount / docs.length;
};

const computeSkippedRate = (docs: SimulationDocReport[]) => {
  const skippedCount = docs.reduce((rate, doc) => (rate += doc.status === 'skipped' ? 1 : 0), 0);

  return skippedCount / docs.length;
};

const computeMappingProperties = (detectedFields: NamedFieldDefinitionConfig[]) => {
  return Object.fromEntries(detectedFields.map(({ name, type }) => [name, { type }]));
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

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const isMappingFailure = (entry: any) => entry.doc?.error?.type === 'document_parsing_exception';

const isNonAdditiveSimulationError = (error: SimulationError) =>
  error.type === 'non_additive_processor_failure';
