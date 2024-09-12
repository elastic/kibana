/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';
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
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { CspFinding } from '@kbn/cloud-security-posture-common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';

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
  spaces: SpacesPluginStart;
  cloud: CloudSetup;

  // optional
  usageCollection?: UsageCollectionStart;
}

export interface MisconfigurationBaseEsQuery {
  query?: {
    bool: {
      filter: estypes.QueryDslQueryContainer[];
    };
  };
}

export interface UseMisconfigurationOptions extends MisconfigurationBaseEsQuery {
  sort: string[][];
  enabled: boolean;
  pageSize: number;
  ignore_unavailable?: boolean;
}

export type LatestFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
export type LatestFindingsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<CspFinding, FindingsAggs>
>;

export interface FindingsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}
