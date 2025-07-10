/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition, ProcessorDefinition, Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { AssignArgs } from 'xstate5';
import { StreamEnrichmentContextType } from './types';
import {
  convertToFieldDefinition,
  getMappedSchemaFields,
  getUnmappedSchemaFields,
} from '../simulation_state_machine';
import {
  EnrichmentUrlState,
  KqlSamplesDataSource,
  RandomSamplesDataSource,
  CustomSamplesDataSource,
  EnrichmentDataSource,
} from '../../../../../../common/url_schema';
import { dataSourceConverter, processorConverter } from '../../utils';

export const defaultRandomSamplesDataSource: RandomSamplesDataSource = {
  type: 'random-samples',
  name: i18n.translate('xpack.streams.enrichment.dataSources.randomSamples.defaultName', {
    defaultMessage: 'Random samples',
  }),
  enabled: true,
};

export const defaultKqlSamplesDataSource: KqlSamplesDataSource = {
  type: 'kql-samples',
  name: '',
  enabled: true,
  timeRange: {
    from: 'now-15m',
    to: 'now',
  },
  filters: [],
  query: {
    language: 'kuery',
    query: '',
  },
};

export const defaultCustomSamplesDataSource: CustomSamplesDataSource = {
  type: 'custom-samples',
  name: '',
  enabled: true,
  documents: [],
};

export const defaultEnrichmentUrlState: EnrichmentUrlState = {
  v: 1,
  dataSources: [defaultRandomSamplesDataSource],
};

export function getDataSourcesUrlState(context: StreamEnrichmentContextType) {
  const dataSources = context.dataSourcesRefs.map(
    (dataSourceRef) => dataSourceRef.getSnapshot().context.dataSource
  );

  return dataSources
    .filter((dataSource) => dataSource.type !== 'custom-samples') // Custom samples are not stored in the URL
    .map(dataSourceConverter.toUrlSchema);
}

export function getDataSourcesSamples(context: StreamEnrichmentContextType) {
  const dataSourcesSnapshots = context.dataSourcesRefs
    .map((dataSourceRef) => dataSourceRef.getSnapshot())
    .filter((snapshot) => snapshot.matches('enabled'));

  return dataSourcesSnapshots.flatMap((snapshot) => snapshot.context.data);
}

/**
 * Gets processors for simulation based on current editing state.
 * - If no processor is being edited: returns all new processors
 * - If a processor is being edited: returns new processors up to and including the one being edited
 */
export function getProcessorsForSimulation(context: StreamEnrichmentContextType) {
  let newProcessorsSnapshots = context.processorsRefs
    .map((procRef) => procRef.getSnapshot())
    .filter((snapshot) => snapshot.context.isNew);

  // Find if any processor is currently being edited
  const editingProcessorIndex = newProcessorsSnapshots.findIndex(
    (snapshot) => snapshot.matches({ configured: 'editing' }) || snapshot.matches('draft')
  );

  // If a processor is being edited, set new processors up to and including the one being edited
  if (editingProcessorIndex !== -1) {
    newProcessorsSnapshots = newProcessorsSnapshots.slice(0, editingProcessorIndex + 1);
  }

  // Return processors
  return newProcessorsSnapshots.map((snapshot) => snapshot.context.processor);
}

export function getConfiguredProcessors(context: StreamEnrichmentContextType) {
  return context.processorsRefs
    .map((proc) => proc.getSnapshot())
    .filter((proc) => proc.matches('configured'))
    .map((proc) => proc.context.processor);
}

export function getUpsertWiredFields(
  context: StreamEnrichmentContextType
): FieldDefinition | undefined {
  if (!Streams.WiredStream.GetResponse.is(context.definition) || !context.simulatorRef) {
    return undefined;
  }

  const originalFieldDefinition = { ...context.definition.stream.ingest.wired.fields };

  const { detectedSchemaFields } = context.simulatorRef.getSnapshot().context;

  // Remove unmapped fields from original definition
  const unmappedSchemaFields = getUnmappedSchemaFields(detectedSchemaFields);
  unmappedSchemaFields.forEach((field) => {
    delete originalFieldDefinition[field.name];
  });

  const mappedSchemaFields = getMappedSchemaFields(detectedSchemaFields).filter(
    (field) => !originalFieldDefinition[field.name]
  );

  const simulationMappedFieldDefinition = convertToFieldDefinition(mappedSchemaFields);

  return { ...originalFieldDefinition, ...simulationMappedFieldDefinition };
}

export const spawnProcessor = <
  TAssignArgs extends AssignArgs<StreamEnrichmentContextType, any, any, any>
>(
  processor: ProcessorDefinition,
  assignArgs: TAssignArgs,
  options?: { isNew: boolean }
) => {
  const { spawn, self } = assignArgs;
  const processorWithUIAttributes = processorConverter.toUIDefinition(processor);

  return spawn('processorMachine', {
    id: processorWithUIAttributes.id,
    input: {
      parentRef: self,
      processor: processorWithUIAttributes,
      isNew: options?.isNew ?? false,
    },
  });
};

export const spawnDataSource = <
  TAssignArgs extends AssignArgs<StreamEnrichmentContextType, any, any, any>
>(
  dataSource: EnrichmentDataSource,
  assignArgs: TAssignArgs
) => {
  const { spawn, context, self } = assignArgs;
  const dataSourceWithUIAttributes = dataSourceConverter.toUIDefinition(dataSource);

  return spawn('dataSourceMachine', {
    id: dataSourceWithUIAttributes.id,
    input: {
      parentRef: self,
      streamName: context.definition.stream.name,
      dataSource: dataSourceWithUIAttributes,
    },
  });
};
