/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { usePageUrlState, type UrlStateService } from '@kbn/ml-url-state';
import { useSeverityOptions } from './use_severity_options';
import type { ExplorerAppState } from '../../../../common/types/locator';
import { ML_PAGES } from '../../../../common/constants/locator';

export type AnomalyExplorerUrlStateService = UrlStateService<ExplorerAppState>;

interface LegacyExplorerPageUrlState {
  pageKey: 'mlExplorerSwimlane';
  pageUrlState: ExplorerAppState['mlExplorerSwimlane'];
}

interface ExplorerPageUrlState {
  pageKey: typeof ML_PAGES.ANOMALY_EXPLORER;
  pageUrlState: ExplorerAppState;
}

export function useExplorerUrlState() {
  /**
   * Originally `mlExplorerSwimlane` resided directly in the app URL state (`_a` URL state key).
   * With current URL structure it has been moved under the `explorer` key of the app state (_a).
   */
  const [legacyExplorerState] = usePageUrlState<LegacyExplorerPageUrlState>('mlExplorerSwimlane');
  const severityOptions = useSeverityOptions();

  const [explorerState, setExplorerState, explorerStateService] =
    usePageUrlState<ExplorerPageUrlState>(ML_PAGES.ANOMALY_EXPLORER, {
      mlExplorerSwimlane: legacyExplorerState,
      mlExplorerFilter: {},
    });

  // Handle backward compatibility for old severity format
  useEffect(() => {
    const swimlaneState = explorerState.mlExplorerSwimlane;
    const severity = swimlaneState?.severity;

    // Check if this is the old format (single number instead of array)
    if (typeof severity === 'number') {
      // Convert old single number format to new array format
      // Find all severities with val >= the old value
      const compatibleSeverities = severityOptions
        .filter((option) => option.val >= severity)
        .map((option) => option.threshold);

      setExplorerState({
        ...explorerState,
        mlExplorerSwimlane: {
          ...swimlaneState,
          severity: compatibleSeverities,
        },
      });
    }
  }, [explorerState, severityOptions, setExplorerState]);

  return [explorerState, setExplorerState, explorerStateService] as const;
}
