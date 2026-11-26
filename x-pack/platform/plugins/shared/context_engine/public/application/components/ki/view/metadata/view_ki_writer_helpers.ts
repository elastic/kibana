/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import type { KiJsonValue } from '../../../../../../common/http_api/knowledge_indicators';
import { formatKiJsonValueAsString } from './view_ki_document_helpers';
import type { KiGetUrlForApp } from './view_ki_uri_helpers';

export const getWriterAgentId = (metadata: Record<string, KiJsonValue>): string | undefined => {
  const value = metadata.agent_id;
  if (value === undefined) {
    return undefined;
  }
  const formatted = formatKiJsonValueAsString(value);
  return formatted.length > 0 ? formatted : undefined;
};

export const getKiWriterAgentManageHref = (
  getUrlForApp: KiGetUrlForApp,
  agentId: string
): string | undefined =>
  getUrlForApp(AGENT_BUILDER_APP_ID, {
    path: `/manage/agents/${encodeURIComponent(agentId)}`,
  });
