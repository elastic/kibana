/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export class IndexManagementExtensions {
  private _summaries: any[] = [];
  private _actions: any[] = [];
  private _banners: any[] = [];
  private _filters: any[] = [];
  private _badges: any[] = [
    {
      matchIndex: (index: { isFrozen: boolean }) => {
        return index.isFrozen;
      },
      label: i18n.translate('xpack.idxMgmt.frozenBadgeLabel', {
        defaultMessage: 'Frozen',
      }),
      filterExpression: 'isFrozen:true',
      color: 'primary',
    },
  ];
  private _toggles: any[] = [];

  public addSummary(summary: any) {
    this._summaries.push(summary);
  }

  public addAction(action: any) {
    this._actions.push(action);
  }

  public addBanner(banner: any) {
    this._banners.push(banner);
  }

  public addFilter(filter: any) {
    this._filters.push(filter);
  }

  public addBadge(badge: any) {
    this._badges.push(badge);
  }

  public addToggle(toggle: any) {
    this._toggles.push(toggle);
  }

  public get summaries() {
    return this._summaries;
  }

  public get actions() {
    return this._actions;
  }

  public get banners() {
    return this._banners;
  }

  public get filters() {
    return this._filters;
  }

  public get badges() {
    return this._badges;
  }

  public get toggles() {
    return this._toggles;
  }
}

/**
 * Temp, to be removed once IM is moved to the "plugins" folder
 */
export const indexManagementExtensions = new IndexManagementExtensions();
