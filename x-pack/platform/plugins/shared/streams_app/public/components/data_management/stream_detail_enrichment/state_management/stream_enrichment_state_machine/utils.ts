/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition, Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { AssignArgs } from 'xstate5';
import { StreamEnrichmentContextType } from './types';
import {
  SampleDocumentWithUIAttributes,
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
import { dataSourceConverter } from '../../utils';

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

export function getStagedProcessors(context: StreamEnrichmentContextType) {
  return context.processorsRefs
    .map((proc) => proc.getSnapshot())
    .filter((proc) => proc.context.isNew)
    .map((proc) => proc.context.processor);
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
