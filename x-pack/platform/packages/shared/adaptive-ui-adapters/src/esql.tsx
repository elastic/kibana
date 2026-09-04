/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EsqlAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { ViewSpec } from '@kbn/adaptive-ui';
import { CodeBlock, Text, View, toViewSpec } from '@kbn/adaptive-ui/jsx';

/**
 * Alternate rendering for the `esql` attachment ([esql_attachment.tsx](../../../../plugins/shared/agent_builder_platform/public/attachment_types/esql_attachment.tsx)):
 * the query as a highlighted `codeBlock` with the optional description as prose
 * above it (the attachment drops `description` from its inline body).
 */
export const toEsqlViewSpec = ({ query, description }: EsqlAttachmentData): ViewSpec =>
  toViewSpec(
    <View title="ES|QL query">
      {description && <Text body={description} />}
      <CodeBlock language="esql" code={query} />
    </View>
  );

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
