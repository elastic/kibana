/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlAttachmentData } from '@kbn/agent-builder-common/attachments';
import { codeBlock, text, view } from '@kbn/adaptive-ui/builders';
import type { BodyNode, ViewSpec } from '@kbn/adaptive-ui';

/**
 * Alternate rendering for the `esql` attachment ([esql_attachment.tsx](../../../../plugins/shared/agent_builder_platform/public/attachment_types/esql_attachment.tsx)):
 * the query as a highlighted `codeBlock` with the optional description as prose
 * above it (the attachment drops `description` from its inline body).
 */
export const toEsqlViewSpec = ({ query, description }: EsqlAttachmentData): ViewSpec => {
  const body: BodyNode[] = [];
  if (description) {
    body.push(text({ body: description }));
  }
  body.push(codeBlock({ language: 'esql', code: query }));
  return view({ title: 'ES|QL query', body });
};

export const sampleEsqlAttachment: EsqlAttachmentData = {
  description: 'Top 5 hosts by failed authentications in the last 24 hours.',
  query: [
    'FROM logs-auth-*',
    '| WHERE event.outcome == "failure"',
    '| STATS failures = COUNT(*) BY host.name',
    '| SORT failures DESC',
    '| LIMIT 5',
  ].join('\n'),
};
