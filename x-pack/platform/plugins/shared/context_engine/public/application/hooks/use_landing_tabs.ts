/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import { useMemo } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { aiIndicesTabLabel, memoryTabLabel } from '../layout/context_engine_landing_labels';
import { CONTEXT_ENGINE_PATHS } from '../paths';
import { useMemoryEnabled } from './use_memory_enabled';
import { useNavigation } from './use_navigation';

/** Landing page tabs. Undefined while memory is off, since AI indices would be the only tab. */
export const useLandingTabs = (): AppHeaderTab[] | undefined => {
  const isMemoryEnabled = useMemoryEnabled();
  const { navigateToContextEngine } = useNavigation();
  const isMemoryTab = useRouteMatch({ path: CONTEXT_ENGINE_PATHS.memory, exact: true }) !== null;

  return useMemo(() => {
    if (!isMemoryEnabled) {
      return undefined;
    }
    return [
      {
        id: 'ai_indices',
        label: aiIndicesTabLabel,
        isSelected: !isMemoryTab,
        onClick: () => navigateToContextEngine(CONTEXT_ENGINE_PATHS.landing),
        'data-test-subj': 'contextLandingTab-ai_indices',
      },
      {
        id: 'memory',
        label: memoryTabLabel,
        isSelected: isMemoryTab,
        onClick: () => navigateToContextEngine(CONTEXT_ENGINE_PATHS.memory),
        'data-test-subj': 'contextLandingTab-memory',
      },
    ];
  }, [isMemoryEnabled, isMemoryTab, navigateToContextEngine]);
};
