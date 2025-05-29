/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ContentPackSavedObject } from './saved_object';

export * from './api';
export * from './saved_object';

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

export function isContentPackSavedObject(entry: ContentPackEntry): entry is ContentPackSavedObject {
  return ['dashboard', 'index-pattern'].includes(entry.type);
}

export type ContentPackEntry = ContentPackSavedObject;

export interface ContentPack extends ContentPackManifest {
  entries: ContentPackEntry[];
}

export interface ContentPackPreviewEntry {
  type: string;
  id: string;
  title: string;
  errors: Array<{ severity: 'fatal' | 'warning'; message: string }>;
}

export interface ContentPackPreview extends ContentPackManifest {
  entries: ContentPackPreviewEntry[];
}
