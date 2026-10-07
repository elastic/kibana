/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { readKiDocumentLifecycleStatus } from '../../../../common/ki_lifecycle_status';
import type { KiJsonValue, KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { type KiLifecycleStatus, type KiReferenceRelation } from '../../../../common/step_types/ki';

export interface KiReferenceDisplayRow {
  uri: string;
  relation: KiReferenceRelation | '';
  description: string;
}

export interface KiGovernanceWriter {
  uri: string;
  metadata: Record<string, KiJsonValue>;
}

export interface KiGovernanceView {
  lifecycleStatus?: KiLifecycleStatus;
  createdBy?: KiGovernanceWriter;
  updatedBy?: KiGovernanceWriter;
}

const isKiJsonObject = (value: KiJsonValue | undefined): value is { [key: string]: KiJsonValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseWriter = (value: KiJsonValue | undefined): KiGovernanceWriter | undefined => {
  if (typeof value === 'string') {
    return value.length > 0 ? { uri: value, metadata: {} } : undefined;
  }
  if (!isKiJsonObject(value)) {
    return undefined;
  }
  const uriValue = value.uri;
  if (typeof uriValue !== 'string' || uriValue.length === 0) {
    return undefined;
  }

  return {
    uri: uriValue,
    metadata: isKiJsonObject(value.metadata) ? { ...value.metadata } : {},
  };
};

export const readKiGovernance = (document: KiDocument): KiGovernanceView => {
  const governance = document.governance;
  if (!isKiJsonObject(governance)) {
    return {};
  }

  const lifecycleStatus = readKiDocumentLifecycleStatus(document);

  const provenance = governance.provenance;
  if (!isKiJsonObject(provenance)) {
    return { lifecycleStatus };
  }

  return {
    lifecycleStatus,
    createdBy: parseWriter(provenance.created_by),
    updatedBy: parseWriter(provenance.updated_by),
  };
};

/** Coerces KI JSON values to a display string; tolerates malformed workflow provenance types. */
export const formatKiJsonValueAsString = (value: KiJsonValue): string => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ');
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
};

export const documentAttributesToRows = (
  document: KiDocument
): Array<{ key: string; value: string }> => {
  const raw = document.attributes;
  if (!isKiJsonObject(raw)) {
    return [];
  }
  return Object.entries(raw).map(([key, value]) => ({
    key,
    value: formatKiJsonValueAsString(value),
  }));
};

export const getKiReferenceRelationLabel = (relation: KiReferenceRelation): string => relation;

export const formatWriterMetadata = (metadata: Record<string, KiJsonValue>): string =>
  Object.entries(metadata)
    .map(([key, value]) => `${key}: ${formatKiJsonValueAsString(value)}`)
    .join(', ');

export interface ParsedWriterUri {
  scheme: string;
  identifier: string;
}

const WRITER_URI_PATTERN = /^([^:]+):\/\/(.+)$/;

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
    return uri;
  }
  const scheme = parsed.scheme.toLowerCase();
  if (scheme === 'workflow') {
    return getUrlForApp(WORKFLOWS_APP_ID, {
      path: `/${encodeURIComponent(parsed.identifier)}`,
    });
  }
  if (scheme === 'tool') {
    return getUrlForApp(AGENT_BUILDER_APP_ID, {
      path: `/manage/tools/${encodeURIComponent(parsed.identifier)}`,
    });
  }
  return undefined;
};
