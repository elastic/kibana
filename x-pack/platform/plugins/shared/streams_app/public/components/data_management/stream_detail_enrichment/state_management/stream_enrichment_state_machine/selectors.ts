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
import type { ProcessorResources } from '../steps_state_machine/types';
import type { StreamlangProcessorDefinitionWithUIAttributes } from '@kbn/streamlang';

/**
 * Selects the processor marked as the draft processor.
 */
export const selectDraftProcessor = (
  context: StreamEnrichmentContextType
): {
  processor?: StreamlangProcessorDefinitionWithUIAttributes;
  resources?: ProcessorResources;
} => {
  const draft = context.stepRefs.find((stepRef) => {
    const snapshot = stepRef.getSnapshot();
    return (
      isActionBlock(snapshot.context.step) && isStepUnderEdit(snapshot) && snapshot.context.isNew
    );
  });

  const snapshot = draft?.getSnapshot();

  if (draft && snapshot && isActionBlock(snapshot.context.step)) {
    const step = snapshot.context.step;
    let resources = snapshot.context.resources;

    // Ensure GROK preview highlighting also works for URL-prepopulated processors
    if (step.action === 'grok' && (!resources || !resources.grokExpressions)) {
      const patterns: string[] = step.patterns ?? [];
      resources = {
        grokExpressions: patterns.map(
          (p) => new DraftGrokExpression(context.grokCollection, p)
        ),
      };
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
