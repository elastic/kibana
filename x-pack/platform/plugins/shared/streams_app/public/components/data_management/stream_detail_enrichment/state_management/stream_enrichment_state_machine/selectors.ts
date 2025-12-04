/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { isActionBlock } from '@kbn/streamlang';
import moment from 'moment';
import { getStreamTypeFromDefinition } from '../../../../../util/get_stream_type_from_definition';
import type { StreamEnrichmentContextType } from './types';
import { isStepUnderEdit } from '../steps_state_machine';
import { canDataSourceTypeBeOutdated } from './utils';
import type { DataSourceContext } from '../data_source_state_machine';

/**
 * Selects the processor marked as the draft processor.
 */
export const selectDraftProcessor = (context: StreamEnrichmentContextType) => {
  const draft = context.stepRefs.find((stepRef) => {
    const snapshot = stepRef.getSnapshot();
    return (
      isActionBlock(snapshot.context.step) && isStepUnderEdit(snapshot) && snapshot.context.isNew
    );
  });

  const snapshot = draft?.getSnapshot();

  return draft && isActionBlock(snapshot?.context.step)
    ? {
        processor: snapshot.context.step,
        resources: snapshot.context.resources,
      }
    : {
        processor: undefined,
        resources: undefined,
      };
};

/**
 * Selects whether there are any new processors before the persisted ones.
 */
export const selectWhetherAnyProcessorBeforePersisted = createSelector(
  [(context: StreamEnrichmentContextType) => context.stepRefs],
  (processorsRefs) => {
    return processorsRefs
      .map((ref) => ref.getSnapshot())
      .some((snapshot, id, processorSnapshots) => {
        // Skip if this processor is already persisted
        if (!snapshot.context.isNew) return false;

        // Check if there are persisted processors after this position
        const hasPersistedAfter = processorSnapshots
          .slice(id + 1)
          .some(({ context }) => !context.isNew);

        return hasPersistedAfter;
      });
  }
);

/**
 * Selects validation errors for all processors.
 * Returns a Map of step customIdentifier to validation errors.
 * Validation errors are computed in the state machine and stored in context.
 */
export const selectValidationErrors = (context: StreamEnrichmentContextType) => {
  return context.validationErrors;
};

export const selectWhetherThereAreOutdatedDocumentsInSimulation = createSelector(
  [
    (streamEnrichmentContext: StreamEnrichmentContextType) =>
      streamEnrichmentContext.definition.stream.ingest.processing.updated_at,
    (_: StreamEnrichmentContextType, dataSourceContext: DataSourceContext | undefined) =>
      dataSourceContext?.dataSource.type,
    (_: StreamEnrichmentContextType, dataSourceContext: DataSourceContext | undefined) =>
      dataSourceContext?.data,
  ],
  (processingUpdatedAt, dataSourceType, dataSourceSamples) => {
    if (!dataSourceType || !dataSourceSamples) {
      return false;
    }

    if (!canDataSourceTypeBeOutdated(dataSourceType)) {
      return false;
    }

    if (dataSourceSamples.length === 0) {
      return false;
    }

    const documentsTimestamps = dataSourceSamples
      .map((doc) => doc['@timestamp'])
      .filter(
        (timestamp): timestamp is string | number =>
          typeof timestamp === 'string' || typeof timestamp === 'number'
      )
      .map((timestamp) => moment(timestamp))
      .filter((momentDate) => momentDate.isValid())
      .map((momentDate) => momentDate.toDate().getTime());

    if (documentsTimestamps.length === 0) {
      return false;
    }

    const oldestDocumentTimestamp = Math.min(...documentsTimestamps);
    const streamProcessingTimestamp = new Date(processingUpdatedAt).getTime();

    return oldestDocumentTimestamp < streamProcessingTimestamp;
  }
);

export const selectStreamType = createSelector(
  [(context: StreamEnrichmentContextType) => context.definition],
  (definition) => {
    return getStreamTypeFromDefinition(definition.stream);
  }
);
