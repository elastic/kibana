/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import type { KiJsonValue, KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { KI_REFERENCE_RELATIONS, type KiReferenceRelation } from '../../../../common/step_types/ki';
import { capitalizeLabel, getKiTypeLabel } from './helpers';

export interface KiEditableDraft {
  type: string;
  title: string;
  description: string;
  content: string;
  expiresAt: string;
}

export interface KiReferenceDisplayRow {
  uri: string;
  relation: KiReferenceRelation | '';
  description: string;
}

export interface KiGovernanceWriter {
  uri: string;
  metadata: Record<string, string | number>;
}

export interface KiGovernanceView {
  lifecycleStatus?: string;
  createdBy?: KiGovernanceWriter;
  updatedBy?: KiGovernanceWriter;
}

const isKiJsonObject = (value: KiJsonValue | undefined): value is { [key: string]: KiJsonValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getDocumentString = (document: KiDocument, key: string): string => {
  const value = document[key];
  return typeof value === 'string' ? value : '';
};

export const getMemorySessionId = (document: KiDocument): string | undefined => {
  const attributes = document.attributes;
  if (typeof attributes !== 'object' || attributes === null || Array.isArray(attributes)) {
    return undefined;
  }
  const value = attributes['memory.session_id'];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export const getDocumentStringArray = (document: KiDocument, key: string): string[] => {
  const value = document[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
};

const parseWriter = (value: KiJsonValue | undefined): KiGovernanceWriter | undefined => {
  if (typeof value === 'string') {
    const uri = value.trim();
    return uri.length > 0 ? { uri, metadata: {} } : undefined;
  }
  if (!isKiJsonObject(value)) {
    return undefined;
  }
  const uriValue = value.uri;
  if (typeof uriValue !== 'string' || uriValue.length === 0) {
    return undefined;
  }
  const metadata: Record<string, string | number> = {};
  const rawMetadata = value.metadata;
  if (isKiJsonObject(rawMetadata)) {
    for (const [key, entry] of Object.entries(rawMetadata)) {
      if (typeof entry === 'string' || typeof entry === 'number') {
        metadata[key] = entry;
      }
    }
  }
  return { uri: uriValue, metadata };
};

/** Extracts read-only governance fields from a stored KI document. */
export const readKiGovernance = (document: KiDocument): KiGovernanceView => {
  const governance = document.governance;
  if (!isKiJsonObject(governance)) {
    return {};
  }

  const lifecycle = governance.lifecycle;
  let lifecycleStatus: string | undefined;
  if (isKiJsonObject(lifecycle) && typeof lifecycle.status === 'string') {
    lifecycleStatus = lifecycle.status;
  }

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

export const formatKiAttributeValue = (value: KiJsonValue): string => {
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
    value: formatKiAttributeValue(value),
  }));
};

const isKiReferenceRelation = (value: string): value is KiReferenceRelation =>
  (KI_REFERENCE_RELATIONS as readonly string[]).includes(value);

export const documentReferencesToRows = (document: KiDocument): KiReferenceDisplayRow[] => {
  const raw = document.references;
  if (!Array.isArray(raw)) {
    return [];
  }
  const rows: KiReferenceDisplayRow[] = [];
  for (const entry of raw) {
    if (!isKiJsonObject(entry)) {
      continue;
    }
    const uri = typeof entry.uri === 'string' ? entry.uri : '';
    if (uri.length === 0) {
      continue;
    }
    const relationRaw = entry.relation;
    const relation =
      typeof relationRaw === 'string' && isKiReferenceRelation(relationRaw) ? relationRaw : '';
    const description = typeof entry.description === 'string' ? entry.description : '';
    rows.push({ uri, relation, description });
  }
  return rows;
};

/** Builds an editable draft from the fetched KI document. */
export const buildDraftFromDocument = (document: KiDocument): KiEditableDraft => ({
  type: getDocumentString(document, 'type'),
  title: getDocumentString(document, 'title'),
  description: getDocumentString(document, 'description'),
  content: getDocumentString(document, 'content'),
  expiresAt: getDocumentString(document, 'expires_at'),
});

/** Merges the draft into a copy of the document for client-side save. */
export const buildDocumentFromDraft = (
  document: KiDocument,
  draft: KiEditableDraft
): KiDocument => {
  const merged: KiDocument = { ...document };

  merged.type = draft.type.trim();
  merged.title = draft.title.trim();

  const description = draft.description.trim();
  if (description.length > 0) {
    merged.description = description;
  } else {
    delete merged.description;
  }

  const content = draft.content.trim();
  if (content.length > 0) {
    merged.content = content;
  } else {
    delete merged.content;
  }

  const expiresAt = draft.expiresAt.trim();
  if (expiresAt.length > 0) {
    merged.expires_at = expiresAt;
  } else {
    delete merged.expires_at;
  }

  return merged;
};

export const getKiReferenceRelationLabel = (relation: KiReferenceRelation): string =>
  capitalizeLabel(getKiTypeLabel(relation));

export const formatWriterMetadata = (metadata: Record<string, string | number>): string =>
  Object.entries(metadata)
    .map(([key, value]) => `${key}: ${value}`)
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

export const getWriterUriSchemeLabel = (scheme: string): string => {
  switch (scheme.toLowerCase()) {
    case 'workflow':
      return i18n.translate('xpack.contextEngine.kiDetail.writerUri.scheme.workflow', {
        defaultMessage: 'Workflow',
      });
    case 'tool':
      return i18n.translate('xpack.contextEngine.kiDetail.writerUri.scheme.tool', {
        defaultMessage: 'Tool',
      });
    default:
      return capitalizeLabel(scheme);
  }
};

export const getWriterAgentId = (metadata: Record<string, string | number>): string | undefined => {
  const value = metadata.agent_id;
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return undefined;
};

export const isHttpUri = (uri: string): boolean =>
  uri.startsWith('http://') || uri.startsWith('https://');

export type KiGetUrlForApp = (appId: string, options?: { path?: string }) => string;

const tryGetUrlForApp = (
  getUrlForApp: KiGetUrlForApp,
  appId: string,
  path: string
): string | undefined => {
  try {
    return getUrlForApp(appId, { path });
  } catch {
    return undefined;
  }
};

/** Agent Builder manage URL for a provenance `agent_id` metadata value. */
export const getKiWriterAgentManageHref = (
  getUrlForApp: KiGetUrlForApp,
  agentId: string
): string | undefined => {
  const trimmed = agentId.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return tryGetUrlForApp(
    getUrlForApp,
    AGENT_BUILDER_APP_ID,
    `/manage/agents/${encodeURIComponent(trimmed)}`
  );
};

/** In-app (or absolute http) href for a provenance writer URI. */
export const getKiWriterUriHref = (
  getUrlForApp: KiGetUrlForApp,
  uri: string
): string | undefined => {
  const trimmed = uri.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (isHttpUri(trimmed)) {
    return trimmed;
  }
  const parsed = parseWriterUri(trimmed);
  if (!parsed) {
    return undefined;
  }
  const scheme = parsed.scheme.toLowerCase();
  if (scheme === 'workflow') {
    return tryGetUrlForApp(
      getUrlForApp,
      WORKFLOWS_APP_ID,
      `/${encodeURIComponent(parsed.identifier)}`
    );
  }
  if (scheme === 'tool') {
    return tryGetUrlForApp(
      getUrlForApp,
      AGENT_BUILDER_APP_ID,
      `/manage/tools/${encodeURIComponent(parsed.identifier)}`
    );
  }
  return undefined;
};
