/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import type { AssignArgs } from 'xstate5';
import type { StreamlangProcessorDefinition } from '@kbn/streamlang/types/processors';
import type { StreamEnrichmentContextType } from './types';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine';
import {
  convertToFieldDefinition,
  getMappedSchemaFields,
  getUnmappedSchemaFields,
} from '../simulation_state_machine';
import type {
  EnrichmentUrlState,
  KqlSamplesDataSource,
  RandomSamplesDataSource,
  CustomSamplesDataSource,
  EnrichmentDataSource,
} from '../../../../../../common/url_schema';
import { dataSourceConverter, processorConverter } from '../../utils';
import { isProcessorUnderEdit } from '../processor_state_machine';

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

export function getDataSourcesSamples(
  context: StreamEnrichmentContextType
): SampleDocumentWithUIAttributes[] {
  const dataSourcesSnapshots = context.dataSourcesRefs
    .map((dataSourceRef) => dataSourceRef.getSnapshot())
    .filter((snapshot) => snapshot.matches('enabled'));

  return dataSourcesSnapshots.flatMap((snapshot) => {
    return snapshot.context.data.map((doc) => ({
      dataSourceId: snapshot.context.dataSource.id,
      document: doc,
    }));
  });
}

/**
 * Gets processors for simulation based on current editing state.
 * - If no processor is being edited: returns all new processors
 * - If a processor is being edited: returns new processors up to and including the one being edited
 */
export function getProcessorsForSimulation({
  processorsRefs,
}: Pick<StreamEnrichmentContextType, 'processorsRefs'>) {
  let newProcessorsSnapshots = processorsRefs
    .map((procRef) => procRef.getSnapshot())
    .filter((snapshot) => snapshot.context.isNew);

  // Find if any processor is currently being edited
  const editingProcessorIndex = newProcessorsSnapshots.findIndex(isProcessorUnderEdit);

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

export function getUpsertFields(context: StreamEnrichmentContextType): FieldDefinition | undefined {
  if (!context.simulatorRef) {
    return undefined;
  }

  const originalFieldDefinition = {
    ...(Streams.WiredStream.GetResponse.is(context.definition)
      ? context.definition.stream.ingest.wired.fields
      : context.definition.stream.ingest.classic.field_overrides),
  };

  const { detectedSchemaFields } = context.simulatorRef.getSnapshot().context;

  // Remove unmapped fields from original definition
  const unmappedSchemaFields = getUnmappedSchemaFields(detectedSchemaFields);
  unmappedSchemaFields.forEach((field) => {
    delete originalFieldDefinition[field.name];
  });

  const mappedSchemaFields = getMappedSchemaFields(detectedSchemaFields);

  const simulationMappedFieldDefinition = convertToFieldDefinition(mappedSchemaFields);

  return { ...originalFieldDefinition, ...simulationMappedFieldDefinition };
}

export const spawnProcessor = <
  TAssignArgs extends AssignArgs<StreamEnrichmentContextType, any, any, any>
>(
  processor: StreamlangProcessorDefinition,
  assignArgs: Pick<TAssignArgs, 'self' | 'spawn'>,
  options?: { isNew: boolean }
) => {
  const { spawn, self } = assignArgs;
  const convertedProcessor = processorConverter.toUIDefinition(processor);

  return spawn('processorMachine', {
    id: convertedProcessor.customIdentifier,
    input: {
      parentRef: self,
      processor: convertedProcessor,
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
