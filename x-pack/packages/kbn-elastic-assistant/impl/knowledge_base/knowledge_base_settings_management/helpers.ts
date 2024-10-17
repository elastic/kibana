/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DocumentEntryType,
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import { z } from '@kbn/zod';

export const isSystemEntry = (
  entry: KnowledgeBaseEntryResponse
): entry is KnowledgeBaseEntryResponse & {
  type: DocumentEntryType;
  kbResource: 'esql' | 'security_labs';
} => {
  return (
    entry.type === DocumentEntryType.value && ['esql', 'security_labs'].includes(entry.kbResource)
  );
};

export const isGlobalEntry = (
  entry: KnowledgeBaseEntryResponse
): entry is KnowledgeBaseEntryResponse => entry.users != null && !entry.users.length;

export const isKnowledgeBaseEntryCreateProps = (
  entry: unknown
): entry is z.infer<typeof KnowledgeBaseEntryCreateProps> => {
  const result = KnowledgeBaseEntryCreateProps.safeParse(entry);
  return result.success;
};

export const isKnowledgeBaseEntryResponse = (
  entry: unknown
): entry is z.infer<typeof KnowledgeBaseEntryResponse> => {
  const result = KnowledgeBaseEntryResponse.safeParse(entry);
  return result.success;
};
