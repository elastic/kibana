/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import type { SavedObject } from '@kbn/core/server';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/common/content_management/v2';

interface ContentPackManifest {
  name: string;
  description: string;
  version: string;
}

const contentPackManifestSchema: z.Schema<ContentPackManifest> = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
});

interface ContentPack extends ContentPackManifest {
  entries: ContentPackEntry[];
}

type ContentPackDashboard = SavedObject<DashboardAttributes>;

type ContentPackEntry = ContentPackDashboard;

export {
  type ContentPackDashboard,
  type ContentPackEntry,
  type ContentPack,
  type ContentPackManifest,
  contentPackManifestSchema,
};
