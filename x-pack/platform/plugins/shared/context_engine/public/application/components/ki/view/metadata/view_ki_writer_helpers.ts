/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import type { KiJsonValue } from '../../../../../../common/http_api/knowledge_indicators';
import { type KiReferenceRelation } from '../../../../../../common/step_types/ki';
import {
  KI_WRITER_URI_SCHEME_TOOL,
  KI_WRITER_URI_SCHEME_WORKFLOW,
  WRITER_URI_PATTERN,
} from '../view_ki_constants';
import { formatKiJsonValueAsString } from './view_ki_document_helpers';

export interface KiReferenceDisplayRow {
  uri: string;
  relation: KiReferenceRelation | '';
  description: string;
}

export const getKiReferenceRelationLabel = (relation: KiReferenceRelation): string => relation;

export const formatWriterMetadata = (metadata: Record<string, KiJsonValue>): string =>
  Object.entries(metadata)
    .map(([key, value]) => `${key}: ${formatKiJsonValueAsString(value)}`)
    .join(', ');

export interface ParsedWriterUri {
  scheme: string;
  identifier: string;
}

/** Splits provenance URIs such as `workflow://id` or `tool://platform.foo.bar`. */
export const parseWriterUri = (uri: string): ParsedWriterUri | undefined => {
  const match = WRITER_URI_PATTERN.exec(uri);
  if (!match) {
    return undefined;
  }
  const scheme = match[1];
  const identifier = match[2];
  if (scheme.length === 0 || identifier.length === 0) {
    return undefined;
  }
  return { scheme, identifier };
};

export const getWriterAgentId = (metadata: Record<string, KiJsonValue>): string | undefined => {
  const value = metadata.agent_id;
  if (value === undefined) {
    return undefined;
  }
  const formatted = formatKiJsonValueAsString(value);
  return formatted.length > 0 ? formatted : undefined;
};

export type KiGetUrlForApp = (appId: string, options?: { path?: string }) => string;

export const getKiWriterAgentManageHref = (
  getUrlForApp: KiGetUrlForApp,
  agentId: string
): string | undefined =>
  getUrlForApp(AGENT_BUILDER_APP_ID, {
    path: `/manage/agents/${encodeURIComponent(agentId)}`,
  });

export const getKiWriterUriHref = (
  getUrlForApp: KiGetUrlForApp,
  uri: string
): string | undefined => {
  const parsed = parseWriterUri(uri);
  if (!parsed) {
    return undefined;
  }
  const scheme = parsed.scheme.toLowerCase();
  if (scheme === KI_WRITER_URI_SCHEME_WORKFLOW) {
    return getUrlForApp(WORKFLOWS_APP_ID, {
      path: `/${encodeURIComponent(parsed.identifier)}`,
    });
  }
  if (scheme === KI_WRITER_URI_SCHEME_TOOL) {
    return getUrlForApp(AGENT_BUILDER_APP_ID, {
      path: `/manage/tools/${encodeURIComponent(parsed.identifier)}`,
    });
  }
  return uri;
};
