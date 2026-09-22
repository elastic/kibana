/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { CortexEditAction, CortexEntityType } from '../../common/cortex';
import {
  cortexEditAppliedEventType,
  cortexHydratedEventType,
  NIGHTSHIFT_CORTEX_EDIT_APPLIED_EVENT_TYPE,
  NIGHTSHIFT_CORTEX_HYDRATED_EVENT_TYPE,
  type CortexEditAppliedProps,
  type CortexHydratedProps,
} from './cortex_events';

/** An edit the optimizer actually wrote — proposals that matched no page are excluded. */
export interface AppliedCortexEdit {
  action: CortexEditAction;
  entityType: CortexEntityType;
}

export interface CortexTelemetry {
  reportHydrated: (pages: ReadonlyArray<{ entity_type: CortexEntityType }>) => void;
  reportEditsApplied: (edits: readonly AppliedCortexEdit[]) => void;
}

export const registerCortexTelemetryEvents = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType(cortexHydratedEventType);
  analytics.registerEventType(cortexEditAppliedEventType);
};

/**
 * Binds the ids of one investigator round to the Cortex events emitted during it. Events are
 * bucketed rather than emitted per page or per edit so a large wiki cannot flood the pipeline.
 */
export const createCortexTelemetry = ({
  analytics,
  conversationId,
  roundId,
  logger,
}: {
  analytics: AnalyticsServiceSetup;
  conversationId?: string;
  roundId?: string;
  logger: Logger;
}): CortexTelemetry => {
  // Liquid renders an absent workflow input as an empty string, so falsy ids are dropped rather
  // than reported as empty keywords.
  const runIds = {
    ...(conversationId ? { conversation_id: conversationId } : {}),
    ...(roundId ? { round_id: roundId } : {}),
  };

  // Measuring the wiki must never cost the agent the wiki, so a reporting failure is swallowed.
  // `reportEvent` throws on an unregistered event type, and in dev also on a payload the
  // registered schema rejects.
  const report = (emit: () => void): void => {
    try {
      emit();
    } catch (error) {
      logger.debug(`Failed to report Cortex telemetry: ${error}`);
    }
  };

  return {
    reportHydrated: (pages) => {
      const pageCounts = new Map<CortexEntityType, number>();
      for (const { entity_type: entityType } of pages) {
        pageCounts.set(entityType, (pageCounts.get(entityType) ?? 0) + 1);
      }

      // An empty wiki still means the agent was hydrated, and that is the signal worth watching
      // while Cortex fills up, so it gets an event of its own instead of silence.
      if (pageCounts.size === 0) {
        report(() =>
          analytics.reportEvent<CortexHydratedProps>(NIGHTSHIFT_CORTEX_HYDRATED_EVENT_TYPE, {
            ...runIds,
            page_count: 0,
          })
        );
        return;
      }

      for (const [entityType, pageCount] of pageCounts) {
        report(() =>
          analytics.reportEvent<CortexHydratedProps>(NIGHTSHIFT_CORTEX_HYDRATED_EVENT_TYPE, {
            ...runIds,
            entity_type: entityType,
            page_count: pageCount,
          })
        );
      }
    },

    reportEditsApplied: (edits) => {
      const editCounts = new Map<string, AppliedCortexEdit & { count: number }>();
      for (const { action, entityType } of edits) {
        const key = `${action}:${entityType}`;
        const bucket = editCounts.get(key);
        if (bucket) {
          bucket.count += 1;
          continue;
        }
        editCounts.set(key, { action, entityType, count: 1 });
      }

      for (const { action, entityType, count } of editCounts.values()) {
        report(() =>
          analytics.reportEvent<CortexEditAppliedProps>(NIGHTSHIFT_CORTEX_EDIT_APPLIED_EVENT_TYPE, {
            ...runIds,
            action,
            entity_type: entityType,
            edit_count: count,
          })
        );
      }
    },
  };
};
