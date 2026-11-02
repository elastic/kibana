/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { CONTEXT_ENGINE_PATHS } from '../paths';
import { useMemoryEnabled } from './use_memory_enabled';
import { useNavigation } from './use_navigation';

export type LandingHeaderTabId = 'ai_indices' | 'session_memory';

const aiIndicesTabLabel = i18n.translate('xpack.contextEngine.landing.tabs.aiIndices', {
  defaultMessage: 'AI indices',
});

const sessionMemoryTabLabel = i18n.translate('xpack.contextEngine.landing.tabs.sessionMemory', {
  defaultMessage: 'Session memory',
});

/**
 * Top-level navigation tabs of the Context app. Only rendered while the memory feature is on: with
 * it off the landing page is the single top-level page and keeps its tab-less header.
 */
export const useLandingHeaderTabs = (selected: LandingHeaderTabId): AppHeaderTab[] | undefined => {
  const isMemoryEnabled = useMemoryEnabled();
  const { navigateToContextEngine } = useNavigation();

  return useMemo<AppHeaderTab[] | undefined>(() => {
    if (!isMemoryEnabled) {
      return undefined;
    }
    return [
      {
        id: 'ai_indices',
        label: aiIndicesTabLabel,
        isSelected: selected === 'ai_indices',
        onClick: () => navigateToContextEngine(CONTEXT_ENGINE_PATHS.landing),
        'data-test-subj': 'contextLandingTab-ai_indices',
      },
      {
        id: 'session_memory',
        label: sessionMemoryTabLabel,
        isSelected: selected === 'session_memory',
        onClick: () => navigateToContextEngine(CONTEXT_ENGINE_PATHS.sessionMemory),
        'data-test-subj': 'contextLandingTab-session_memory',
      },
    ];
  }, [isMemoryEnabled, navigateToContextEngine, selected]);
};
