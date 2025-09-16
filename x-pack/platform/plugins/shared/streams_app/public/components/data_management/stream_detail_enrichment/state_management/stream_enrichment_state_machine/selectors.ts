/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { StreamEnrichmentContextType } from './types';
import { isProcessorUnderEdit } from '../processor_state_machine';

/**
 * Selects the processor marked as the draft processor.
 */
export const selectDraftProcessor = (context: StreamEnrichmentContextType) => {
  const draft = context.processorsRefs.find((processorRef) => {
    const snapshot = processorRef.getSnapshot();
    return isProcessorUnderEdit(snapshot) && snapshot.context.isNew;
  });

  const snapshot = draft?.getSnapshot();
  return {
    processor: snapshot?.context.processor,
    resources: snapshot?.context.resources,
  };
};

/**
 * Selects whether there are any new processors before the persisted ones.
 */
export const selectWhetherAnyProcessorBeforePersisted = createSelector(
  [(context: StreamEnrichmentContextType) => context.processorsRefs],
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
