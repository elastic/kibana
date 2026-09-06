/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TextAttachmentData } from '@kbn/agent-builder-common/attachments';
import { text, view } from '@kbn/adaptive-ui/builders';
import type { ViewSpec } from '@kbn/adaptive-ui';

/**
 * Alternate rendering for the `text` attachment ([text_attachment.tsx](../../../../plugins/shared/agent_builder_platform/public/attachment_types/text_attachment.tsx)).
 * The attachment shows `data.content` in a plain `EuiCodeBlock`; the Adaptive UI
 * body renders it as markdown so prose formats and fenced blocks read as code —
 * an improvement that also carries to Slack, markdown, and PNG.
 */
export const toTextViewSpec = ({ content }: TextAttachmentData): ViewSpec =>
  view({ body: [text({ format: 'markdown', body: content })] });

export const sampleTextAttachment: TextAttachmentData = {
  content: [
    'Restarting the ingest pipeline cleared the backlog on `agent.node-2`. The two data nodes that were behind on indexing have caught up; monitor `logs-000042` for recurrence over the next hour.',
    '',
    '```log',
    '[12:03:58] WARN  ingest: queue depth 18211 exceeds soft limit',
    '[12:04:01] INFO  ingest: draining queue for logs-000042',
    '[12:04:02] INFO  ingest: pipeline "logs-default" restarted',
    '[12:04:03] INFO  ingest: queue depth 0',
    '[12:04:03] INFO  ingest: backlog cleared in 4.2s',
    '[12:04:04] INFO  ingest: steady state',
    '```',
  ].join('\n'),
};
