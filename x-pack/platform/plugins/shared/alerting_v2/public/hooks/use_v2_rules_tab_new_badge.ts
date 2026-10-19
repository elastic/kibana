/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { AppHeaderTabIconBadge } from '@kbn/app-header';
import { ALERTING_V2_RULES_APP_ID, ALERTING_V2_SECTION_ID } from '@kbn/alerting-v2-constants';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';

export const V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_RULES_APP_ID}.v2RulesTabNewBadgeVisited` as const;

const NEW_BADGE: AppHeaderTabIconBadge = {
  iconType: 'dot',
  color: 'primary',
  tooltip: i18n.translate('xpack.alertingV2.rulesList.v2RulesTabNewBadgeTooltip', {
    defaultMessage: 'New',
  }),
};

const persistVisited = (): void => {
  try {
    localStorage.setItem(V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY, JSON.stringify(true));
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
};

/**
 * “New” dot for the Universal Rules tab: primary blue, dismissed after the user
 * leaves Universal, matching side-nav new-item timing.
 *
 * Uses selection change for SPA tab switches, and `pagehide` (not React unmount)
 * for full navigations — React Strict Mode / HMR remounts must not dismiss the badge.
 */
export const useV2RulesTabNewBadge = (isSelected: boolean): AppHeaderTabIconBadge | undefined => {
  const [isVisited, setIsVisited] = useLocalStorage<boolean>(
    V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY,
    false
  );
  const wasSelectedRef = useRef(isSelected);
  const isSelectedRef = useRef(isSelected);
  isSelectedRef.current = isSelected;

  const markVisited = useCallback(() => {
    setIsVisited(true);
  }, [setIsVisited]);

  useEffect(() => {
    const wasSelected = wasSelectedRef.current;
    if (wasSelected && !isSelected) {
      markVisited();
    }
    wasSelectedRef.current = isSelected;
  }, [isSelected, markVisited]);

  useEffect(() => {
    const onPageHide = () => {
      if (isSelectedRef.current) {
        persistVisited();
      }
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  if (isVisited) {
    return undefined;
  }

  return NEW_BADGE;
};
