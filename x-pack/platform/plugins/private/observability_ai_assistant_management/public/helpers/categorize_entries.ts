/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';

export interface KnowledgeBaseEntryCategory {
  '@timestamp': string;
  categoryKey: string;
  title: string;
  entries: KnowledgeBaseEntry[];
}

export function categorizeEntries({
  entries,
}: {
  entries: KnowledgeBaseEntry[];
}): KnowledgeBaseEntryCategory[] {
  return entries.reduce((acc, entry) => {
    const categoryKey = entry.labels?.category ?? entry.id;

    const existingEntry = acc.find((item) => item.categoryKey === categoryKey);
    if (existingEntry) {
      existingEntry.entries.push(entry);
      return acc;
    }

    return acc.concat({
      categoryKey,
      title: entry.labels?.category ?? entry.title ?? 'No title',
      entries: [entry],
      '@timestamp': entry['@timestamp'],
    });
  }, [] as Array<{ categoryKey: string; title: string; entries: KnowledgeBaseEntry[]; '@timestamp': string }>);
}
