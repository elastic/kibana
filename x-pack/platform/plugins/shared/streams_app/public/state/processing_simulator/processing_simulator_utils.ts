/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty, uniq, uniqBy } from 'lodash';
import { APIReturnType } from '@kbn/streams-plugin/public';
import {
  getProcessorConfig,
  UnaryOperator,
  Condition,
} from '@kbn/streams-schema';
import { ProcessorDefinitionWithUIAttributes, DetectedField } from '../../components/data_management/stream_detail_enrichment/types';

export type Simulation = APIReturnType<'POST /api/streams/{name}/processing/_simulate'>;
export type ProcessorMetrics =
  Simulation['processors_metrics'][keyof Simulation['processors_metrics']];

export interface TableColumn {
  name: string;
  origin: 'processor' | 'detected';
}

export const docsFilterOptions = {
  outcome_filter_all: {
    id: 'outcome_filter_all',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.all',
      { defaultMessage: 'All samples' }
    ),
  },
  outcome_filter_matched: {
    id: 'outcome_filter_matched',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.matched',
      { defaultMessage: 'Matched' }
    ),
  },
  outcome_filter_unmatched: {
    id: 'outcome_filter_unmatched',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.unmatched',
      { defaultMessage: 'Unmatched' }
    ),
  },
} as const;

export type DocsFilterOption = keyof typeof docsFilterOptions;

export const composeSamplingCondition = (
  processors: ProcessorDefinitionWithUIAttributes[]
): Condition | undefined => {
  if (isEmpty(processors)) {
    return undefined;
  }

  const uniqueFields = uniq(getSourceFields(processors));

  const conditions = uniqueFields.map((field) => ({
    field,
    operator: 'exists' as UnaryOperator,
  }));

  return { or: conditions };
};

export const getSourceFields = (processors: ProcessorDefinitionWithUIAttributes[]): string[] => {
  return processors.map((processor) => getProcessorConfig(processor).field);
};

export const getTableColumns = (
  processors: ProcessorDefinitionWithUIAttributes[],
  fields: DetectedField[]
) => {
  const uniqueProcessorsFields = getSourceFields(processors).map((name) => ({
    name,
    origin: 'processor',
  }));

  const uniqueDetectedFields = fields.map((field) => ({
    name: field.name,
    origin: 'detected',
  }));

  return uniqBy([...uniqueProcessorsFields, ...uniqueDetectedFields], 'name') as TableColumn[];
};

export const filterDocumentsByOutcome = (
  simulation: Simulation | null, 
  filter: DocsFilterOption
) => {
  if (!simulation?.documents) {
    return [];
  }
  
  switch (filter) {
    case 'outcome_filter_matched':
      return simulation.documents.filter((doc) => doc.status === 'parsed');
    case 'outcome_filter_unmatched':
      return simulation.documents.filter((doc) => doc.status !== 'parsed');
    case 'outcome_filter_all':
    default:
      return simulation.documents;
  }
};
