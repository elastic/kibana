/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { AppDeepLink, AppUpdater, HttpStart } from '@kbn/core/public';
import type { CustomAppListItem } from '../common/app_definition';
import { API_BASE_PATH } from '../common/constants';

/**
 * Apps flagged `showInNav` appear in the side navigation as deep links under
 * Custom apps. Deep links are the supported way to add entries at runtime: the
 * app is registered once with an `updater$`, and pushing a new updater
 * re-renders the navigation without re-registering anything.
 */
export function toDeepLinks(items: CustomAppListItem[]): AppDeepLink[] {
  return items
    .filter((item) => item.showInNav)
    .map((item) => ({
      id: item.id,
      title: item.title,
      path: `/app/${item.id}`,
      visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
    }));
}

export class CustomAppsNavLinks {
  public readonly updater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  /**
   * Rebuilds the navigation entries from the current app list. Failures are
   * swallowed: a missing nav link is a much smaller problem than a broken app
   * listing, and the next refresh will correct it.
   */
  public refresh = async (http: HttpStart): Promise<void> => {
    try {
      const { items } = await http.get<{ items: CustomAppListItem[] }>(API_BASE_PATH);
      const deepLinks = toDeepLinks(items);
      this.updater$.next(() => ({ deepLinks }));
    } catch {
      // Leave whatever links are already shown in place.
    }
  };
}
