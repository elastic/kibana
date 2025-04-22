/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/common/content_management/v2';
import type { DataViewSavedObjectAttrs } from '@kbn/data-views-plugin/common/data_views';

type ContentPackDashboard = SavedObject<DashboardAttributes>;
type ContentPackDataView = SavedObject<DataViewSavedObjectAttrs>;
export type ContentPackSavedObject = ContentPackDashboard | ContentPackDataView;

export interface SavedObjectLink {
  source_id: string;
  target_id: string;
}

export type SavedObjectLinkWithReferences = SavedObjectLink & { references: SavedObjectLink[] };

export interface ContentPackSavedObjectLinks {
  dashboards: SavedObjectLinkWithReferences[];
}
