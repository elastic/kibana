/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { CASE_SAVED_OBJECT, CASE_EXTENDED_FIELDS } from '../../../common/constants';
import type { Template } from '../../../common/types/domain/template/v1';

export interface ExtendedFieldFilter {
  label: string;
  value: string;
}

export interface ResolvedExtendedFieldFilter {
  storageKey: string;
  value: string;
  esType: string;
  control: string;
}

type RuntimeType = 'keyword' | 'long' | 'double' | 'date';

const ES_TYPE_TO_RUNTIME_TYPE: Record<string, RuntimeType> = {
  keyword: 'keyword',
  long: 'long',
  integer: 'long',
  short: 'long',
  byte: 'long',
  unsigned_long: 'long',
  double: 'double',
  float: 'double',
  half_float: 'double',
  scaled_float: 'double',
  date: 'date',
};

const mapToRuntimeType = (esType: string): RuntimeType =>
  ES_TYPE_TO_RUNTIME_TYPE[esType] ?? 'keyword';

const CHECKBOX_GROUP = 'CHECKBOX_GROUP';

// flattened fields do not support doc_values per subfield, so doc[] access always
// returns an empty value. We must use params._source to read the actual stored value.
//
// Kibana SO _source structure: { "<SO_type>": { <attributes> }, "type": "...", "references": [...] }
// So the path to extended_fields is: params._source[CASE_SO_TYPE][CASE_EXTENDED_FIELDS][storageKey]
const buildPainlessScript = (
  storageKey: string,
  runtimeType: RuntimeType,
  control: string
): string => {
  const soType = `'${CASE_SAVED_OBJECT}'`;
  const efKey = `'${CASE_EXTENDED_FIELDS}'`;
  const fieldKey = `'${storageKey}'`;

  const readRaw =
    `if (params._source == null) { return; }` +
    `def so = params._source.get(${soType});` +
    `if (so == null) { return; }` +
    `def ef = so.get(${efKey});` +
    `if (ef == null) { return; }` +
    `def rawVal = ef.get(${fieldKey});` +
    `if (rawVal == null) { return; }` +
    `def raw = rawVal.toString();`;

  // Strip JSON array punctuation using Painless regex literals (avoids Java String.replaceAll
  // escaping issues with \s and character classes across JSON serialisation boundaries).
  const splitArrayScript =
    `def cleaned = /[\\[\\]"]/.matcher(raw).replaceAll('').trim();` +
    `def arr = /,/.split(cleaned);` +
    `for (def item : arr) { if (!item.trim().isEmpty()) { emit(item.trim()); } }`;

  if (control === CHECKBOX_GROUP) {
    // Checkbox values are stored as a JSON-stringified array, e.g. '["api","ui"]'.
    // Strip JSON punctuation, split on comma, emit each item individually.
    // Note: Painless does not support the ?. null-safe operator — explicit null checks required.
    return `${readRaw}${splitArrayScript}`;
  }

  // For keyword fields, auto-detect JSON arrays (e.g. from CHECKBOX_GROUP fields on templates
  // created before the 'control' field was added to fieldNames).
  if (runtimeType === 'keyword') {
    return `${readRaw}if (raw.startsWith('[')) { ${splitArrayScript} } else { emit(raw); }`;
  }

  switch (runtimeType) {
    case 'long':
      return `${readRaw} emit(Long.parseLong(raw));`;
    case 'double':
      return `${readRaw} emit(Double.parseDouble(raw));`;
    case 'date':
      return `${readRaw} emit(new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ").parse(raw).getTime());`;
    default:
      return `${readRaw} emit(raw);`;
  }
};

/**
 * Resolves user-typed label:value filters against template field metadata
 * to produce storage keys and ES types for query construction.
 */
export const resolveExtendedFieldFilters = (
  extendedFieldFilters: ExtendedFieldFilter[],
  templates: Array<Pick<Template, 'fieldNames'>>
): ResolvedExtendedFieldFilter[] => {
  const labelToMeta = new Map<string, { storageKey: string; esType: string; control: string }>();

  for (const template of templates) {
    for (const field of template.fieldNames ?? []) {
      labelToMeta.set(field.label.toLowerCase(), {
        storageKey: `${field.name}_as_${field.type}`,
        esType: field.type,
        control: field.control,
      });
    }
  }

  return extendedFieldFilters
    .map(({ label, value }) => {
      const meta = labelToMeta.get(label.toLowerCase());
      return meta
        ? { storageKey: meta.storageKey, value, esType: meta.esType, control: meta.control }
        : null;
    })
    .filter((f): f is ResolvedExtendedFieldFilter => f !== null);
};

/**
 * Builds ES runtime field mappings for the resolved extended field filters.
 * Each runtime field extracts the value from the flattened extended_fields
 * attribute and casts it to the correct ES type.
 */
export const buildExtendedFieldRuntimeMappings = (
  resolvedFilters: ResolvedExtendedFieldFilter[]
): Record<string, estypes.MappingRuntimeField> => {
  const runtimeMappings: Record<string, estypes.MappingRuntimeField> = {};

  for (const { storageKey, esType, control } of resolvedFilters) {
    const runtimeType = mapToRuntimeType(esType);
    runtimeMappings[`ef_${storageKey}`] = {
      type: runtimeType,
      script: {
        source: buildPainlessScript(storageKey, runtimeType, control),
      },
    };
  }

  return runtimeMappings;
};

/**
 * Builds AND-combined filter clauses that query the runtime fields
 * for the resolved extended field filters.
 */
export const buildExtendedFieldFilterClauses = (
  resolvedFilters: ResolvedExtendedFieldFilter[]
): estypes.QueryDslQueryContainer[] =>
  resolvedFilters.map(({ storageKey, value, esType }) => {
    const runtimeType = mapToRuntimeType(esType);
    const typedValue = runtimeType === 'long' ? Number(value) : value;

    return {
      term: {
        [`ef_${storageKey}`]: { value: typedValue },
      },
    };
  });
