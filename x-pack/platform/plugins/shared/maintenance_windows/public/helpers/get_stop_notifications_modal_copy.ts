/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';

/** Whether a scope is turned on, and if so, whether it has a filter. */
export type ScopeFilterState = 'off' | 'filtered' | 'unfiltered';

export interface StopNotificationsModalCopy {
  title: string;
  body: string;
}

export const getScopeFilterState = (enabled: boolean, payload: unknown): ScopeFilterState => {
  if (!enabled) return 'off';
  return payload ? 'filtered' : 'unfiltered';
};

/**
 * Returns the copy for the confirmation shown when a turned-on scope has no filter, or `null`
 * when no confirmation is needed. The title names every scope that will stop notifications for
 * all of its alerts, so it stays accurate when only one of two turned-on scopes has a filter.
 */
export const getStopNotificationsModalCopy = (
  classic: ScopeFilterState,
  universal: ScopeFilterState
): StopNotificationsModalCopy | null => {
  const classicUnfiltered = classic === 'unfiltered';
  const universalUnfiltered = universal === 'unfiltered';

  if (!classicUnfiltered && !universalUnfiltered) {
    return null;
  }

  if (classicUnfiltered && universalUnfiltered) {
    return {
      title: i18n.STOP_ALL_NOTIFICATIONS_MODAL_TITLE_BOTH,
      body: i18n.STOP_ALL_NOTIFICATIONS_MODAL_BODY_NO_FILTERS,
    };
  }

  if (classicUnfiltered) {
    return {
      title: i18n.STOP_ALL_NOTIFICATIONS_MODAL_TITLE_CLASSIC,
      body:
        universal === 'filtered'
          ? i18n.STOP_ALL_NOTIFICATIONS_MODAL_BODY_CLASSIC_UNFILTERED
          : i18n.STOP_ALL_NOTIFICATIONS_MODAL_BODY_NO_FILTERS,
    };
  }

  return {
    title: i18n.STOP_ALL_NOTIFICATIONS_MODAL_TITLE_UNIVERSAL,
    body:
      classic === 'filtered'
        ? i18n.STOP_ALL_NOTIFICATIONS_MODAL_BODY_UNIVERSAL_UNFILTERED
        : i18n.STOP_ALL_NOTIFICATIONS_MODAL_BODY_NO_FILTERS,
  };
};
