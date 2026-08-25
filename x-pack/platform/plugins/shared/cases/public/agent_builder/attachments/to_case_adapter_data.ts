/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseData } from '@kbn/adaptive-ui-adapters';
import type { CaseAttachmentData } from '../../../common/types/agent_builder/attachment_schemas';

export const toCaseAdapterData = (data: CaseAttachmentData): CaseData => ({
  id: data.id,
  incremental_id: data.incremental_id ?? undefined,
  title: data.title,
  description: data.description,
  status: data.status,
  severity: data.severity,
  totalAlerts: data.totalAlerts,
  totalComment: data.totalComment,
  total_observables: data.total_observables ?? undefined,
  tags: data.tags,
  owner: data.owner,
  assignees: data.assignees?.map((assignee) => assignee.uid),
  category: data.category,
  connector_name: data.connector_name ?? undefined,
  created_at: data.created_at,
  updated_at: data.updated_at ?? undefined,
  url: data.url ?? undefined,
});
