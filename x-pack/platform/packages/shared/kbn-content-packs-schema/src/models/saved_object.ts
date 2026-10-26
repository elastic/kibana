/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import type { SavedObject } from '@kbn/core/server';
import type { DashboardSavedObjectAttributes } from '@kbn/dashboard-plugin/server';
import type { DataViewSavedObjectAttrs } from '@kbn/data-views-plugin/common/data_views';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { ContentPackEntry } from '.';

export const SUPPORTED_SAVED_OBJECT_TYPE: Record<ContentPackSavedObject['type'], string> = {
  dashboard: 'dashboard',
  'index-pattern': 'index_pattern',
  lens: 'lens',
};

export const isSupportedSavedObjectType = (
  entry: SavedObject<unknown> | ContentPackEntry
): entry is ContentPackSavedObject => {
  return entry.type in SUPPORTED_SAVED_OBJECT_TYPE;
};

export const isDashboardFile = (rootDir: string, filepath: string) => {
  const subDir = SUPPORTED_SAVED_OBJECT_TYPE.dashboard;
  return path.dirname(filepath) === path.join(rootDir, 'kibana', subDir);
};

export const isSupportedReferenceType = (type: string) => {
  const referenceTypes: Array<ContentPackSavedObject['type']> = ['index-pattern', 'lens'];
  return referenceTypes.some((refType) => refType === type);
};

export type ContentPackDashboard = SavedObject<DashboardSavedObjectAttributes> & {
  type: 'dashboard';
};
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
