/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SavedObject } from '@kbn/core/server';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/common/content_management/v2';

interface ContentPack {
  name: string;
  content: string;
}

const contentPackSchema: z.Schema<ContentPack> = z.object({
  name: z.string(),
  content: z.string(),
});

interface ContentPackSavedObject<T = DashboardAttributes> {
  type: 'saved_object';
  content: SavedObject<T>;
}

type ContentPackObject = ContentPackSavedObject;

export { contentPackSchema, type ContentPack, type ContentPackObject, type ContentPackSavedObject };
