/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { isActionBlock } from '@kbn/streamlang';
import type { StreamEnrichmentContextType } from './types';
import { isStepUnderEdit } from '../steps_state_machine';
import { DraftGrokExpression } from '@kbn/grok-ui';

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

  if (draft && isActionBlock(snapshot?.context.step)) {
    const step = snapshot!.context.step as any;
    let resources = snapshot!.context.resources;

    // Ensure GROK preview highlighting also works for URL-prepopulated processors
    if (step.action === 'grok' && (!resources || !resources.grokExpressions)) {
      const patterns: string[] = step.patterns ?? [];
      resources = {
        grokExpressions: patterns.map(
          (p: string) => new DraftGrokExpression(context.grokCollection, p)
        ),
      } as any;
    }

    return { processor: step, resources };
  }

  return { processor: undefined, resources: undefined };
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
