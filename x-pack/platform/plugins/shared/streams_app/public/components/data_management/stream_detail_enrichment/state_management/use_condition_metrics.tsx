/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  useSimulatorSelector,
} from './stream_enrichment_state_machine';

const createEmptyStatusCounts = () => ({
  parsed: 0,
  partially_parsed: 0,
  skipped: 0,
  failed: 0,
});

export type ConditionMatchMetrics = {
  matchRate: number | null;
  matchedCount: number;
  totalCount: number;
  statusCounts: ReturnType<typeof createEmptyStatusCounts>;
};

export const useConditionMatchMetrics = (conditionId: string | undefined) => {
  const simulationDocuments = useSimulatorSelector(
    (state) => state.context.simulation?.documents
  );

  const metrics = useMemo<ConditionMatchMetrics>(() => {
    if (!conditionId || !simulationDocuments || simulationDocuments.length === 0) {
      return {
        matchRate: null,
        matchedCount: 0,
        totalCount: simulationDocuments?.length ?? 0,
        statusCounts: createEmptyStatusCounts(),
      };
    }

    const matchedDocuments = simulationDocuments.filter(
      (doc) =>
        Array.isArray(doc.matched_conditions) && doc.matched_conditions.includes(conditionId)
    );

    const matchedCount = matchedDocuments.length;
    const statusCounts = createEmptyStatusCounts();

    matchedDocuments.forEach((doc) => {
      const status = doc.status as keyof typeof statusCounts;
      if (statusCounts[status] !== undefined) {
        statusCounts[status] += 1;
      }
    });

    if (matchedCount === 0) {
      return {
        matchRate: 0,
        matchedCount: 0,
        totalCount: simulationDocuments.length,
        statusCounts,
      };
    }

    return {
      matchRate: matchedCount / simulationDocuments.length,
      matchedCount,
      totalCount: simulationDocuments.length,
      statusCounts,
    };
  }, [conditionId, simulationDocuments]);

  return metrics;
};

