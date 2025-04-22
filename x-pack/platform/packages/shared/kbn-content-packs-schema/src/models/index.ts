/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SavedObject } from '@kbn/core/server';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/common/content_management/v2';
import type { DataViewSavedObjectAttrs } from '@kbn/data-views-plugin/common/data_views';

export interface ContentPackManifest {
  name: string;
  description: string;
  version: string;
}

export const contentPackManifestSchema: z.Schema<ContentPackManifest> = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
});

export interface ContentPack extends ContentPackManifest {
  entries: ContentPackEntry[];
}

type ContentPackDashboard = SavedObject<DashboardAttributes>;
type ContentPackDataView = SavedObject<DataViewSavedObjectAttrs>;
export type ContentPackSavedObject = ContentPackDashboard | ContentPackDataView;

export type ContentPackEntry = ContentPackSavedObject;

export interface ContentPackIncludeObjects {
  objects: {
    dashboards: string[];
  };
}

export interface ContentPackIncludeAll {
  all: {};
}

export type ContentPackIncludedObjects = ContentPackIncludeObjects | ContentPackIncludeAll;

const contentPackIncludeObjectsSchema = z.object({
  objects: z.object({ dashboards: z.array(z.string()) }),
});
const contentPackIncludeAllSchema = z.object({ all: z.strictObject({}) });

export const isIncludeAll = (value: ContentPackIncludedObjects): value is ContentPackIncludeAll => {
  return contentPackIncludeAllSchema.safeParse(value).success;
};

export const contentPackIncludedObjectsSchema: z.Schema<ContentPackIncludedObjects> = z.union([
  contentPackIncludeObjectsSchema,
  contentPackIncludeAllSchema,
]);
