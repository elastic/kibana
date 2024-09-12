/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocumentEntryType, KnowledgeBaseEntryResponse } from '@kbn/elastic-assistant-common';

export const isEsqlSystemEntry = (
  entry: KnowledgeBaseEntryResponse
): entry is KnowledgeBaseEntryResponse & {
  type: DocumentEntryType;
  kbResource: 'esql';
} => {
  return entry.type === DocumentEntryType.value && entry.kbResource === 'esql';
};
