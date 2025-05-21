/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { z } from '@kbn/zod';
import { ContentPackSavedObject, SUPPORTED_SAVED_OBJECT_TYPE } from './saved_object';
import { ContentPackFields } from './fields';
import { ContentPackProcessors } from './processors';

export * from './api';
export * from './saved_object';
export * from './fields';
export * from './processors';

export const SUPPORTED_ENTRY_TYPE: Record<ContentPackEntry['type'], string[]> = {
  ...SUPPORTED_SAVED_OBJECT_TYPE,
  fields: ['fields'],
  processors: ['processors'],
};

export type ContentPackConfiguration = ContentPackFields | ContentPackProcessors;

export function isConfigurationEntry(entry: ContentPackEntry): entry is ContentPackConfiguration {
  return ['fields', 'processors'].includes(entry.type);
}

export type SupportedEntryType = keyof typeof SUPPORTED_ENTRY_TYPE;

export const isSupportedFile = (rootDir: string, filepath: string) => {
  return Object.values(SUPPORTED_ENTRY_TYPE).some(
    (dirs) => path.dirname(filepath) === path.join(rootDir, ...dirs)
  );
};

export const getEntryTypeByFile = (rootDir: string, filepath: string): SupportedEntryType => {
  const entry = Object.entries(SUPPORTED_ENTRY_TYPE).find(
    ([t, dirs]) => path.dirname(filepath) === path.join(rootDir, ...dirs)
  ) as [SupportedEntryType, string] | undefined;

  if (!entry) {
    throw new Error(`Unknown entry type for filepath [${filepath}]`);
  }

  return entry[0];
};

export const isSupportedEntryType = (type: string) => {
  return type in SUPPORTED_ENTRY_TYPE;
};

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

export type ContentPackEntry = ContentPackSavedObject | ContentPackConfiguration;

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
