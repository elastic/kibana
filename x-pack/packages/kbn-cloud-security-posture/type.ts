/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ToastsStart } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';

import type { BoolQuery } from '@kbn/es-query';
export interface FindingsBaseEsQuery {
  query?: {
    bool: BoolQuery;
  };
}

export interface CspClientPluginStartDeps {
  // required
  data: DataPublicPluginStart;
  dataViews: DataViewsServicePublic;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
  toastNotifications: ToastsStart;
  charts: ChartsPluginStart;
  discover: DiscoverStart;
  fleet: FleetStart;
  licensing: LicensingPluginStart;
  share: SharePluginStart;
  storage: Storage;

  // optional
  usageCollection?: UsageCollectionStart;
}

export type CspStatusCode =
  | 'indexed' // latest findings index exists and has results
  | 'indexing' // index timeout was not surpassed since installation, assumes data is being indexed
  | 'unprivileged' // user lacks privileges for the latest findings index
  | 'index-timeout' // index timeout was surpassed since installation
  | 'not-deployed' // no healthy agents were deployed
  | 'not-installed' // number of installed csp integrations is 0;
  | 'waiting_for_results'; // have healthy agents but no findings at all, assumes data is being indexed for the 1st time

export type IndexStatus =
  | 'not-empty' // Index contains documents
  | 'empty' // Index doesn't contain documents (or doesn't exist)
  | 'unprivileged'; // User doesn't have access to query the index

export interface IndexDetails {
  index: string;
  status: IndexStatus;
}

export interface BaseCspSetupBothPolicy {
  status: CspStatusCode;
  installedPackagePolicies: number;
  healthyAgents: number;
}

export interface BaseCspSetupStatus {
  indicesDetails: IndexDetails[];
  latestPackageVersion: string;
  cspm: BaseCspSetupBothPolicy;
  kspm: BaseCspSetupBothPolicy;
  vuln_mgmt: BaseCspSetupBothPolicy;
  isPluginInitialized: boolean;
  installedPackageVersion?: string | undefined;
}

export type CspSetupStatus = BaseCspSetupStatus;
