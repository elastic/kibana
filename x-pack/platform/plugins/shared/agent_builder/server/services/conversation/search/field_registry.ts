/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import type { ConversationSearchFilterField } from '@kbn/agent-builder-common';
import {
  CONVERSATION_SEARCH_FILTER_FIELDS,
  CONVERSATION_SEARCH_METADATA_FIELD_PREFIX,
} from '@kbn/agent-builder-common';
import { conversationIndexName } from '../client/storage';

export const METADATA_KEY_MAX_LENGTH = 256;

interface ConversationFilterFieldDefinition {
  path: string;
  esType: 'keyword' | 'date';
  nestedPath?: string;
}

const FIELD_DEFINITIONS: Record<ConversationSearchFilterField, ConversationFilterFieldDefinition> =
  {
    owner: { path: 'user_id', esType: 'keyword' },
    agent_id: { path: 'agent_id', esType: 'keyword' },
    template_id: { path: 'template_id', esType: 'keyword' },
    event_type: { path: 'events.type', esType: 'keyword', nestedPath: 'events' },
    attachment_type: { path: 'attachments.type', esType: 'keyword' },
    attachment_id: { path: 'attachments.id', esType: 'keyword' },
    status: { path: 'status', esType: 'keyword' },
    created_at: { path: 'created_at', esType: 'date' },
    updated_at: { path: 'updated_at', esType: 'date' },
  };

/**
 * A filter field resolved against the registry, ready to be written back into a KQL AST.
 */
export interface ResolvedFilterField {
  path: string;
  astPath: string;
  nestedPath?: string;
  rangeSupported: boolean;
}

const toResolvedField = ({
  path,
  esType,
  nestedPath,
}: ConversationFilterFieldDefinition): ResolvedFilterField => ({
  path,
  astPath: nestedPath ? path.slice(nestedPath.length + 1) : path,
  nestedPath,
  rangeSupported: esType === 'date',
});

const isMetadataField = (apiFieldName: string): boolean =>
  apiFieldName.startsWith(`${CONVERSATION_SEARCH_METADATA_FIELD_PREFIX}.`);

const isKnownField = (apiFieldName: string): apiFieldName is ConversationSearchFilterField =>
  (CONVERSATION_SEARCH_FILTER_FIELDS as readonly string[]).includes(apiFieldName);

/**
 * Resolves an API field name to its stored counterpart.
 *
 * @param apiFieldName - Field name as written in the caller's KQL filter.
 * @returns The resolved field, or `undefined` when the name is not filterable.
 */
export const resolveFilterField = (apiFieldName: string): ResolvedFilterField | undefined => {
  if (isKnownField(apiFieldName)) {
    return toResolvedField(FIELD_DEFINITIONS[apiFieldName]);
  }

  if (!isMetadataField(apiFieldName)) {
    return undefined;
  }

  const key = apiFieldName.slice(CONVERSATION_SEARCH_METADATA_FIELD_PREFIX.length + 1);
  if (key.length === 0 || key.length > METADATA_KEY_MAX_LENGTH) {
    return undefined;
  }

  return {
    path: apiFieldName,
    astPath: apiFieldName,
    rangeSupported: false,
  };
};

/**
 * Builds the data view KQL compiles filter clauses against.
 *
 * @param metadataPaths - `metadata.<key>` paths the filter references, which cannot be enumerated
 *   ahead of time and are therefore added per query.
 * @returns A data view covering the registry plus the requested metadata keys.
 */
export const buildFilterDataView = (metadataPaths: readonly string[] = []): DataViewBase => {
  const registryFields = Object.values(FIELD_DEFINITIONS).map<DataViewFieldBase>(
    ({ path, esType, nestedPath }) => ({
      name: path,
      type: esType === 'date' ? 'date' : 'string',
      esTypes: [esType],
      scripted: false,
      ...(nestedPath ? { subType: { nested: { path: nestedPath } } } : {}),
    })
  );

  const metadataFields = metadataPaths.map<DataViewFieldBase>((path) => ({
    name: path,
    type: 'string',
    esTypes: ['keyword'],
    scripted: false,
  }));

  return {
    title: conversationIndexName,
    fields: [...registryFields, ...metadataFields],
  };
};
