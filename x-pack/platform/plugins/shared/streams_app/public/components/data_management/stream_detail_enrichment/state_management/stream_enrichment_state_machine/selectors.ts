/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import moment from 'moment';
import type { StreamEnrichmentActorSnapshot } from './stream_enrichment_state_machine';
import { getStreamTypeFromDefinition } from '../../../../../util/get_stream_type_from_definition';
import type { StreamEnrichmentContextType } from './types';
import { canDataSourceTypeBeOutdated } from './utils';
import type { DataSourceContext } from '../data_source_state_machine';

/**
 * Selects whether the state machine is in interactive mode.
 */
export const selectIsInteractiveMode = (state: StreamEnrichmentActorSnapshot) => {
  return state.matches({ ready: { enrichment: { managingProcessors: 'interactive' } } });
};

/**
 * Selects validation errors for all processors.
 * Returns a Map of step customIdentifier to validation errors.
 * Validation errors are computed in the state machine and stored in context.
 */
export const selectValidationErrors = (context: StreamEnrichmentContextType) => {
  return context.validationErrors;
};

/**
 * Returns true if there are any schema errors or validation errors.
 * Schema errors come from Zod parsing failures.
 * Validation errors come from processor validation (namespace, reserved fields, type mismatches).
 */
export const selectHasAnyErrors = (context: StreamEnrichmentContextType): boolean => {
  const hasSchemaErrors = context.schemaErrors.length > 0;
  const hasValidationErrors = context.validationErrors.size > 0;
  return hasSchemaErrors || hasValidationErrors;
};

/**
 * Checks if there are any errors in a parent snapshot context.
 * Used by child machines (YAML mode, interactive mode) to check parent state.
 */
export const hasErrorsInParentSnapshot = (parentSnapshot: {
  context: { schemaErrors: string[]; validationErrors: Map<string, unknown> };
}): boolean => {
  const hasSchemaErrors = parentSnapshot.context.schemaErrors.length > 0;
  const hasValidationErrors = parentSnapshot.context.validationErrors.size > 0;
  return hasSchemaErrors || hasValidationErrors;
};

/**
 * Selects schema errors from Zod parsing.
 */
export const selectSchemaErrors = (context: StreamEnrichmentContextType) => {
  return context.schemaErrors;
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
