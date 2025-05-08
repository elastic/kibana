/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import type { SavedObject } from '@kbn/core/server';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/common/content_management/v2';
import type { DataViewSavedObjectAttrs } from '@kbn/data-views-plugin/common/data_views';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';

export const SUPPORTED_SAVED_OBJECT_TYPES = [
  { type: 'dashboard', dir: 'dashboard' },
  { type: 'index-pattern', dir: 'index_pattern' },
  { type: 'lens', dir: 'lens' },
];
export const isSupportedSavedObjectType = (
  entry: SavedObject<unknown>
): entry is ContentPackSavedObject => {
  return SUPPORTED_SAVED_OBJECT_TYPES.some(({ type }) => type === entry.type);
};

export const isSupportedSavedObjectFile = (filepath: string) => {
  return SUPPORTED_SAVED_OBJECT_TYPES.some(
    ({ dir }) => path.dirname(filepath) === path.join('kibana', dir)
  );
};

type ContentPackDashboard = SavedObject<DashboardAttributes> & { type: 'dashboard' };
type ContentPackDataView = SavedObject<DataViewSavedObjectAttrs> & { type: 'index-pattern' };
type ContentPackLens = SavedObject<LensAttributes> & { type: 'lens' };
export type ContentPackSavedObject = ContentPackDashboard | ContentPackDataView | ContentPackLens;

export interface SavedObjectLink {
  source_id: string;
  target_id: string;
}

export type SavedObjectLinkWithReferences = SavedObjectLink & { references: SavedObjectLink[] };

export interface ContentPackSavedObjectLinks {
  dashboards: SavedObjectLinkWithReferences[];
}
