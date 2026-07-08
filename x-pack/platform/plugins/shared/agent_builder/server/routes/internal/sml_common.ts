/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlDocument } from '@kbn/agent-builder-server';
import type { SmlHttpItem } from '../../../common/http_api/sml';

export const toSmlHttpItem = (doc: SmlDocument): SmlHttpItem => ({
  id: doc.id,
  type: doc.type,
  title: doc.title,
  origin: doc.origin,
  content: doc.content,
  created_at: doc.created_at,
  updated_at: doc.updated_at,
  spaces: doc.spaces,
  tags: doc.tags ?? [],
  permissions: doc.permissions,
  ingestion_method: doc.ingestion_method,
});
