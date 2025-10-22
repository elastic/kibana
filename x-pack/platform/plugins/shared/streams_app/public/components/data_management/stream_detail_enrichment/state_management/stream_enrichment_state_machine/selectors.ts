/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { convertUIStepsToDSL, isActionBlock, validateTypes } from '@kbn/streamlang';
import type { TypeValidationResult } from '@kbn/streamlang';
import type { StreamEnrichmentContextType } from './types';
import { isStepUnderEdit } from '../steps_state_machine';
import { getConfiguredSteps } from './utils';

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
        processor: snapshot?.context.step,
        resources: snapshot?.context.resources,
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
 * Selects the type validation result for the current configured steps.
 * Returns either a TypeValidationResult or an error if validation fails.
 */
export const selectTypeValidationResult = createSelector(
  [
    (context: StreamEnrichmentContextType) => context,
    (context: StreamEnrichmentContextType) => context.schemaFieldsRef.getSnapshot(),
  ],
  (context, schemaFieldsSnapshot): TypeValidationResult | Error => {
    try {
      // Get the configured steps (steps that are ready)
      const configuredSteps = getConfiguredSteps(context);

      // Convert UI steps to DSL
      const dsl = convertUIStepsToDSL(configuredSteps, false);

      // Get field types from schema fields actor
      const fieldTypeMap = Object.fromEntries(
        schemaFieldsSnapshot.context.fields.map((field) => [
          field.name,
          field.type || field.esType || 'unknown',
        ])
      );

      // Run type validation
      return validateTypes(dsl, fieldTypeMap);
    } catch (error) {
      return error as Error;
    }
  }
);
