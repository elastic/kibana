/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChangeHistoryConfig } from '../provider/use_change_history_config';
import type { ChangeHistoryCompareMode } from '../telemetry/types';
import type { ChangeHistoryCompareSpec } from '../types/change_history_compare';
import type { ChangeHistoryDiffTelemetry } from '../types/change_history_diff_telemetry';
import { computeChangeHistoryVersionDistance } from '../utils/compute_change_history_version_distance';

export type { ChangeHistoryDiffTelemetry };

export interface UseChangeHistoryDiffTelemetryArgs {
  compareSpec?: ChangeHistoryCompareSpec;
  isLoadingCompareContext?: boolean;
}

const buildCompareSpecKey = (compareSpec: ChangeHistoryCompareSpec): string =>
  `${compareSpec.comparisonType}:${compareSpec.baseline.id}:${compareSpec.target.id}`;

const buildDiffViewedKey = (
  compareSpec: ChangeHistoryCompareSpec,
  compareMode: ChangeHistoryCompareMode
): string => `${buildCompareSpecKey(compareSpec)}:${compareMode}`;

export const useChangeHistoryDiffTelemetry = ({
  compareSpec,
  isLoadingCompareContext = false,
}: UseChangeHistoryDiffTelemetryArgs): ChangeHistoryDiffTelemetry | undefined => {
  const { renderChangesSummary, telemetry } = useChangeHistoryConfig();
  const [compareMode, setCompareModeState] = useState<ChangeHistoryCompareMode>('unified');
  const lastDiffViewedKeyRef = useRef<string | undefined>();
  const diffDisplayedRef = useRef(false);
  const compareSpecKey = compareSpec ? buildCompareSpecKey(compareSpec) : undefined;

  useEffect(() => {
    diffDisplayedRef.current = false;
    lastDiffViewedKeyRef.current = undefined;
  }, [compareSpecKey]);

  const emitDiffViewed = useCallback(
    (mode: ChangeHistoryCompareMode) => {
      if (!compareSpec || isLoadingCompareContext) {
        return;
      }

      const diffViewedKey = buildDiffViewedKey(compareSpec, mode);
      if (lastDiffViewedKeyRef.current === diffViewedKey) {
        return;
      }

      lastDiffViewedKeyRef.current = diffViewedKey;
      diffDisplayedRef.current = true;

      const versionDistance = computeChangeHistoryVersionDistance(
        compareSpec.baseline,
        compareSpec.target
      );

      const hasChangesSummaryTooltip =
        Boolean(renderChangesSummary) &&
        Boolean(compareSpec.target.changes?.summary ?? compareSpec.baseline.changes?.summary);

      telemetry.reportDiffViewed({
        comparisonType: compareSpec.comparisonType,
        compareMode: mode,
        ...(hasChangesSummaryTooltip ? { hasChangesSummaryTooltip: true } : {}),
        ...(versionDistance !== undefined ? { versionDistance } : {}),
      });
    },
    [compareSpec, isLoadingCompareContext, renderChangesSummary, telemetry]
  );

  const reportDiffViewed = useCallback(() => {
    emitDiffViewed(compareMode);
  }, [compareMode, emitDiffViewed]);

  const setCompareMode = useCallback(
    (mode: ChangeHistoryCompareMode) => {
      setCompareModeState(mode);
      if (diffDisplayedRef.current) {
        emitDiffViewed(mode);
      }
    },
    [emitDiffViewed]
  );

  const reportDiffChangeNavigated = useCallback(
    (navigationSource: string) => {
      if (!diffDisplayedRef.current || !navigationSource) {
        return;
      }

      telemetry.reportDiffChangeNavigated({ navigationSource });
    },
    [telemetry]
  );

  if (!compareSpec) {
    return undefined;
  }

  return {
    compareMode,
    setCompareMode,
    reportDiffViewed,
    reportDiffChangeNavigated,
  };
};
