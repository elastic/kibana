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

export const SUPPORTED_SAVED_OBJECT_TYPE = {
  dashboard: 'dashboard',
  'index-pattern': 'index_pattern',
  lens: 'lens',
};

export type SupportedSavedObjectType = keyof typeof SUPPORTED_SAVED_OBJECT_TYPE;

export const isSupportedSavedObjectType = (
  entry: SavedObject<unknown>
): entry is ContentPackSavedObject => {
  return entry.type in SUPPORTED_SAVED_OBJECT_TYPE;
};

export const isSupportedSavedObjectFile = (filepath: string) => {
  return Object.values(SUPPORTED_SAVED_OBJECT_TYPE).some(
    (dir) => path.dirname(filepath) === path.join('kibana', dir)
  );
};

export const isDashboardFile = (rootDir: string, filepath: string) => {
  const subDir = SUPPORTED_SAVED_OBJECT_TYPE.dashboard;
  return path.dirname(filepath) === path.join(rootDir, 'kibana', subDir);
};

export const isSupportedReferenceType = (type: string) => {
  const referenceTypes: SupportedSavedObjectType[] = ['index-pattern', 'lens'];
  return referenceTypes.some((refType) => refType === type);
};

export type ContentPackDashboard = SavedObject<DashboardAttributes> & { type: 'dashboard' };
export type ContentPackDataView = SavedObject<DataViewSavedObjectAttrs> & { type: 'index-pattern' };
export type ContentPackLens = SavedObject<LensAttributes> & { type: 'lens' };
export type ContentPackSavedObject = ContentPackDashboard | ContentPackDataView | ContentPackLens;

export interface SavedObjectLink {
  source_id: string;
  target_id: string;
}

export type SavedObjectLinkWithReferences = SavedObjectLink & { references: SavedObjectLink[] };

export interface ContentPackSavedObjectLinks {
  dashboards: SavedObjectLinkWithReferences[];
}
