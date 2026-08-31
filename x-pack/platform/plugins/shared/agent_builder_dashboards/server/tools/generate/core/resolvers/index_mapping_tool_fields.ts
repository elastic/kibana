/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { ToolResultStore } from '@kbn/agent-builder-server';
import type { ControlFieldTypes } from '../operations/resolve_aggregatable_control_field';

const FORMATTED_FIELD_LINE = /^- (.+?) \[([^,\]]+)/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseFormattedFieldList = (fields: string): ControlFieldTypes => {
  const parsed: ControlFieldTypes = {};
  for (const line of fields.split('\n')) {
    const match = line.match(FORMATTED_FIELD_LINE);
    const path = match?.[1];
    const type = match?.[2];
    if (path !== undefined && type !== undefined) {
      parsed[path] = type;
    }
  }
  return parsed;
};

const parseFlatFieldList = (fields: unknown[]): ControlFieldTypes | undefined => {
  const parsed: ControlFieldTypes = {};
  for (const field of fields) {
    if (!isRecord(field) || typeof field.path !== 'string' || typeof field.type !== 'string') {
      return undefined;
    }
    parsed[field.path] = field.type;
  }
  return parsed;
};

const parseResourceFields = (resource: unknown): ControlFieldTypes | undefined => {
  if (!isRecord(resource)) {
    return undefined;
  }

  if (typeof resource.fields === 'string') {
    return parseFormattedFieldList(resource.fields);
  }

  if (Array.isArray(resource.fields)) {
    return parseFlatFieldList(resource.fields);
  }

  return undefined;
};

/**
 * Parse `{ resources }` from a `get_index_mapping` tool result into
 * index → { fieldPath → esType }.
 */
export const parseIndexMappingFields = (data: unknown): Record<string, ControlFieldTypes> => {
  if (!isRecord(data) || !isRecord(data.resources)) {
    return {};
  }

  const fieldsByIndex: Record<string, ControlFieldTypes> = {};
  for (const [index, resource] of Object.entries(data.resources)) {
    const fields = parseResourceFields(resource);
    if (fields) {
      fieldsByIndex[index] = fields;
    }
  }
  return fieldsByIndex;
};

interface IndexMappingToolMeta {
  tool_id: string;
  results: Array<{ file: string }>;
}

const isIndexMappingToolMeta = (raw: unknown): raw is IndexMappingToolMeta => {
  if (!isRecord(raw) || raw.tool_id !== platformCoreTools.getIndexMapping) {
    return false;
  }
  if (!Array.isArray(raw.results)) {
    return false;
  }
  return raw.results.every((result) => isRecord(result) && typeof result.file === 'string');
};

/**
 * Collect field types from prior `get_index_mapping` tool calls in this conversation.
 */
export const loadIndexMappingFieldsFromResultStore = async (
  resultStore: Pick<ToolResultStore, 'listEntries' | 'getEntry'>
): Promise<Map<string, ControlFieldTypes>> => {
  const fieldsByIndex = new Map<string, ControlFieldTypes>();
  const rootEntries = await resultStore.listEntries('/');

  for (const entry of rootEntries) {
    if (entry.type !== 'dir') {
      continue;
    }

    const metaEntry = await resultStore.getEntry(`${entry.path}/meta.json`);
    const meta = metaEntry?.content.raw;
    if (!isIndexMappingToolMeta(meta)) {
      continue;
    }

    for (const result of meta.results) {
      const resultEntry = await resultStore.getEntry(`${entry.path}/${result.file}`);
      const parsed = parseIndexMappingFields(resultEntry?.content.raw);
      for (const [index, fields] of Object.entries(parsed)) {
        fieldsByIndex.set(index, { ...fieldsByIndex.get(index), ...fields });
      }
    }
  }

  return fieldsByIndex;
};
