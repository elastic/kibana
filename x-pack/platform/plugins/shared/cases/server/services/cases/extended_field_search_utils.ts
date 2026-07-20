/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { CASE_SAVED_OBJECT, CASE_EXTENDED_FIELDS } from '../../../common/constants';
import type { Template } from '../../../common/types/domain/template/v1';
import { FieldType } from '../../../common/types/domain/template/fields';

export interface ExtendedFieldFilter {
  label: string;
  value: string;
}

export interface ResolvedExtendedFieldFilter {
  storageKey: string;
  value: string;
  esType: string;
  control: string;
  templateVersions: Array<{ id: string; version: number }>;
}

export interface LabelSearchToken {
  text: string;
  exact: boolean;
}

export interface ResolvedFieldLabelFilter {
  storageKey: string;
  esType: string;
  control: string;
  templateVersions: Array<{ id: string; version: number }>;
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

const { CHECKBOX_GROUP, USER_PICKER, DATE_PICKER, INPUT_NUMBER, INPUT_TEXT, TEXTAREA } = FieldType;

const FLATTENED_FIELD_PATH = `${CASE_SAVED_OBJECT}.${CASE_EXTENDED_FIELDS}`;

/**
 * Controls that require a painless runtime script because their stored values
 * can't be queried directly on the flattened mapping:
 * - CHECKBOX_GROUP: stores JSON arrays like '["A","B"]' as a single token
 * - USER_PICKER: stores JSON objects, needs regex to extract names
 * - INPUT_NUMBER: flattened fields can't do numeric range/comparison
 * - INPUT_TEXT / TEXTAREA: need substring matching; flattened fields don't support wildcard queries
 */
const needsRuntimeScript = (control: string, esType: string): boolean =>
  control === CHECKBOX_GROUP ||
  control === USER_PICKER ||
  control === INPUT_NUMBER ||
  control === INPUT_TEXT ||
  control === TEXTAREA ||
  mapToRuntimeType(esType) === 'long' ||
  mapToRuntimeType(esType) === 'double';

// Flattened fields require params._source access; doc[] is always empty for subfields.
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
    `if (ef == null || !(ef instanceof Map)) { return; }` +
    `def rawVal = ef.get(${fieldKey});` +
    `if (rawVal == null) { return; }` +
    `def raw = rawVal.toString();`;

  // Strip JSON array punctuation, split on comma, emit each trimmed token.
  const splitArrayScript =
    `def cleaned = /[\\[\\]"]/.matcher(raw).replaceAll('').trim();` +
    `def arr = /,/.split(cleaned);` +
    `for (def item : arr) { if (!item.trim().isEmpty()) { emit(item.trim()); } }`;

  if (control === USER_PICKER) {
    // Values are stored as '[{"uid":"...","name":"..."}]'; extract only the name via regex.
    return (
      `${readRaw}` +
      `def m = /"name":"([^"]*)"/.matcher(raw);` +
      `while (m.find()) { emit(m.group(1)); }`
    );
  }

  if (control === DATE_PICKER) {
    // Emit the raw ISO string; the runtime field type is set to keyword (see buildExtendedFieldRuntimeMappings)
    // to preserve the ISO format, and the query layer uses a range query for date matching.
    return `${readRaw}emit(raw);`;
  }

  if (control === CHECKBOX_GROUP) {
    return `${readRaw}${splitArrayScript}`;
  }

  // Auto-detect JSON arrays for keyword fields (e.g. legacy templates without a control type).
  if (runtimeType === 'keyword') {
    return `${readRaw}if (raw.startsWith('[')) { ${splitArrayScript} } else { emit(raw); }`;
  }

  switch (runtimeType) {
    case 'long':
      return `${readRaw} emit(Long.parseLong(raw));`;
    case 'double':
      return `${readRaw} emit(Double.parseDouble(raw));`;
    default:
      return `${readRaw} emit(raw);`;
  }
};

export const resolveExtendedFieldFilters = (
  extendedFieldFilters: ExtendedFieldFilter[],
  templates: Array<Pick<Template, 'fieldDefinitions' | 'templateId' | 'templateVersion'>>
): ResolvedExtendedFieldFilter[][] => {
  const labelToMetas = buildLabelToMetasIndex(templates);

  return extendedFieldFilters.flatMap(({ label, value }) => {
    const metas = labelToMetas.get(label.toLowerCase());
    if (metas == null) return [];
    const group = [...metas.values()].map((meta) => ({
      storageKey: meta.storageKey,
      value,
      esType: meta.esType,
      control: meta.control,
      templateVersions: meta.templateVersions,
    }));
    return group.length > 0 ? [group] : [];
  });
};

/** Parses an ISO 8601 date string (YYYY-MM-DD or full ISO timestamp) into a full-day UTC range [gte, lt). */
export const parseDateFilterToRange = (value: string): { gte: string; lt: string } | undefined => {
  const isoPart = value.slice(0, 10);
  const isoMatch = isoPart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoMatch) return undefined;

  const year = parseInt(isoMatch[1], 10);
  const month = parseInt(isoMatch[2], 10);
  const day = parseInt(isoMatch[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) {
    return undefined;
  }

  const start = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(start.getTime())) return undefined;

  // Verify the date components match what was parsed to detect silent rollover
  // (e.g., Feb 30 → Mar 2, Apr 31 → May 1)
  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) {
    return undefined;
  }

  const end = new Date(start.getTime() + 86_400_000);
  return { gte: start.toISOString(), lt: end.toISOString() };
};

/** Builds ES runtime field mappings only for filters that can't use the flattened mapping directly. */
export const buildExtendedFieldRuntimeMappings = (
  resolvedFilterGroups: ResolvedExtendedFieldFilter[][]
): Record<string, estypes.MappingRuntimeField> => {
  const runtimeMappings: Record<string, estypes.MappingRuntimeField> = {};

  for (const { storageKey, esType, control } of resolvedFilterGroups.flat()) {
    if (needsRuntimeScript(control, esType)) {
      const runtimeType = control === DATE_PICKER ? 'keyword' : mapToRuntimeType(esType);
      runtimeMappings[`ef_${storageKey}`] = {
        type: runtimeType,
        script: {
          source: buildPainlessScript(storageKey, runtimeType, control),
        },
      };
    }
  }

  return runtimeMappings;
};

const buildTemplateVersionFilter = (
  templateVersions: Array<{ id: string; version: number }>
): estypes.QueryDslQueryContainer => {
  const templateVersionFilters = templateVersions.map(({ id, version }) => ({
    bool: {
      must: [
        { term: { 'cases.template.id': id } },
        { term: { 'cases.template.version': version } },
      ],
    },
  }));

  return {
    bool: {
      should: templateVersionFilters,
      minimum_should_match: 1,
    },
  };
};

const isFreeTextControl = (control: string): boolean =>
  control === INPUT_TEXT || control === TEXTAREA;

const escapeWildcard = (s: string): string => s.replace(/[\\*?]/g, (c) => `\\${c}`);

const buildFlattenedFilterClause = ({
  storageKey,
  value,
  control,
}: ResolvedExtendedFieldFilter): estypes.QueryDslQueryContainer | null => {
  const flattenedField = `${FLATTENED_FIELD_PATH}.${storageKey}`;

  if (control === DATE_PICKER) {
    const range = parseDateFilterToRange(value);
    if (range == null) return null;
    return { range: { [flattenedField]: range } };
  }

  return { term: { [flattenedField]: value } };
};

const buildRuntimeFilterClause = ({
  storageKey,
  value,
  esType,
  control,
}: ResolvedExtendedFieldFilter): estypes.QueryDslQueryContainer | null => {
  const fieldName = `ef_${storageKey}`;

  if (control === DATE_PICKER) {
    const range = parseDateFilterToRange(value);
    if (range == null) return null;
    return { range: { [fieldName]: range } };
  }

  if (isFreeTextControl(control)) {
    return {
      wildcard: { [fieldName]: { value: `*${escapeWildcard(value)}*`, case_insensitive: true } },
    };
  }

  const runtimeType = mapToRuntimeType(esType);
  const typedValue = runtimeType === 'long' || runtimeType === 'double' ? Number(value) : value;
  if (typeof typedValue === 'number' && isNaN(typedValue)) return null;
  return { term: { [fieldName]: { value: typedValue } } };
};

const buildSingleFilterClause = (
  filter: ResolvedExtendedFieldFilter
): estypes.QueryDslQueryContainer | null => {
  const { esType, control, templateVersions } = filter;

  const valueClause = needsRuntimeScript(control, esType)
    ? buildRuntimeFilterClause(filter)
    : buildFlattenedFilterClause(filter);

  if (valueClause == null) return null;

  return { bool: { filter: [valueClause, buildTemplateVersionFilter(templateVersions)] } };
};

export const buildExtendedFieldFilterClauses = (
  resolvedFilterGroups: ResolvedExtendedFieldFilter[][]
): estypes.QueryDslQueryContainer[] =>
  resolvedFilterGroups.flatMap((group): estypes.QueryDslQueryContainer[] => {
    const clauses = group.flatMap((filter) => {
      const clause = buildSingleFilterClause(filter);
      return clause != null ? [clause] : [];
    });

    if (clauses.length === 0) return [];

    // Multiple entries in the same group mean the same label resolves to different storage keys
    // across templates — OR them so any matching template's case is returned.
    if (clauses.length === 1) return clauses;

    return [{ bool: { should: clauses, minimum_should_match: 1 } }];
  });

/**
 * Parses the search string into tokens for field-label matching.
 * - Quoted phrases ("Start date") become substring-match tokens (exact: false)
 * - Bare words (priority) become exact full-label match tokens (exact: true)
 * Tokens already consumed by label:value syntax should not be present in the input.
 */
export const tokenizeSearchForLabels = (search: string): LabelSearchToken[] => {
  const tokens: LabelSearchToken[] = [];
  const withoutQuoted = search.replace(/"([^"]*)"/g, (_match, quoted: string) => {
    const trimmed = quoted.trim();
    if (trimmed.length > 0) {
      tokens.push({ text: trimmed.toLowerCase(), exact: false });
    }
    return '';
  });

  for (const word of withoutQuoted.split(/\s+/)) {
    const trimmed = word.trim();
    if (trimmed.length > 0) {
      tokens.push({ text: trimmed.toLowerCase(), exact: true });
    }
  }

  return tokens;
};

type LabelToMetasMap = Map<
  string,
  Map<
    string,
    {
      storageKey: string;
      esType: string;
      control: string;
      templateVersions: Array<{ id: string; version: number }>;
    }
  >
>;

const buildLabelToMetasIndex = (
  templates: Array<Pick<Template, 'fieldDefinitions' | 'templateId' | 'templateVersion'>>
): LabelToMetasMap => {
  const labelToMetas: LabelToMetasMap = new Map();

  for (const template of templates) {
    for (const field of template.fieldDefinitions ?? []) {
      const labelKey = field.label.toLowerCase();
      const storageKey = `${field.name}_as_${field.type}`;

      let byStorageKey = labelToMetas.get(labelKey);
      if (byStorageKey == null) {
        byStorageKey = new Map();
        labelToMetas.set(labelKey, byStorageKey);
      }

      let entry = byStorageKey.get(storageKey);
      if (entry == null) {
        entry = {
          storageKey,
          esType: field.type,
          control: field.control,
          templateVersions: [],
        };
        byStorageKey.set(storageKey, entry);
      }

      entry.templateVersions.push({
        id: template.templateId,
        version: template.templateVersion,
      });
    }
  }

  return labelToMetas;
};

/**
 * Resolves search tokens against template field labels.
 * - exact tokens: full label must equal the token text
 * - substring tokens (quoted): label must contain the token text
 */
export const resolveFieldLabelSearch = (
  tokens: LabelSearchToken[],
  templates: Array<Pick<Template, 'fieldDefinitions' | 'templateId' | 'templateVersion'>>
): ResolvedFieldLabelFilter[] => {
  if (tokens.length === 0 || templates.length === 0) return [];

  const labelToMetas = buildLabelToMetasIndex(templates);
  const seen = new Set<string>();
  const results: ResolvedFieldLabelFilter[] = [];

  for (const token of tokens) {
    const matchingMetas: Array<{
      storageKey: string;
      esType: string;
      control: string;
      templateVersions: Array<{ id: string; version: number }>;
    }> = [];

    const normalizedText = token.text.toLowerCase();

    for (const [labelKey, metas] of labelToMetas) {
      const isMatch = token.exact ? labelKey === normalizedText : labelKey.includes(normalizedText);

      if (isMatch) {
        matchingMetas.push(...metas.values());
      }
    }

    for (const meta of matchingMetas) {
      if (!seen.has(meta.storageKey)) {
        seen.add(meta.storageKey);
        results.push({
          storageKey: meta.storageKey,
          esType: meta.esType,
          control: meta.control,
          templateVersions: meta.templateVersions,
        });
      }
    }
  }

  return results;
};

/** Builds runtime field mappings only for field-label existence queries that need scripts. */
export const buildFieldLabelRuntimeMappings = (
  resolvedLabels: ResolvedFieldLabelFilter[]
): Record<string, estypes.MappingRuntimeField> => {
  const runtimeMappings: Record<string, estypes.MappingRuntimeField> = {};

  for (const { storageKey, esType, control } of resolvedLabels) {
    if (needsRuntimeScript(control, esType)) {
      const runtimeType = control === DATE_PICKER ? 'keyword' : mapToRuntimeType(esType);
      runtimeMappings[`ef_${storageKey}`] = {
        type: runtimeType,
        script: {
          source: buildPainlessScript(storageKey, runtimeType, control),
        },
      };
    }
  }

  return runtimeMappings;
};

export const EF_ALL_VALUES_FIELD = `${CASE_SAVED_OBJECT}.ef_all_values`;

/**
 * Builds a runtime field mapping that tokenizes ALL extended field values
 * on whitespace, enabling word-level partial matching across every extended field.
 */
export const buildAllExtendedFieldValuesRuntimeMapping = (): Record<
  string,
  estypes.MappingRuntimeField
> => ({
  [EF_ALL_VALUES_FIELD]: {
    type: 'keyword',
    script: {
      source: buildAllValuesTokenizingScript(),
    },
  },
});

const buildAllValuesTokenizingScript = (): string => {
  const soType = `'${CASE_SAVED_OBJECT}'`;
  const efKey = `'${CASE_EXTENDED_FIELDS}'`;

  return (
    `if (params._source == null) { return; }` +
    `def so = params._source.get(${soType});` +
    `if (so == null) { return; }` +
    `def ef = so.get(${efKey});` +
    `if (ef == null || !(ef instanceof Map)) { return; }` +
    `for (def entry : ef.entrySet()) {` +
    `if (entry.getValue() != null) {` +
    `def raw = entry.getValue().toString();` +
    `def nm = /"name":"([^"]*)"/.matcher(raw);` +
    `boolean found = false;` +
    `while (nm.find()) { found = true; def t = nm.group(1).trim().toLowerCase(Locale.ROOT); if (!t.isEmpty()) { emit(t); } }` +
    `if (!found) {` +
    `def cleaned = /[\\[\\]"{}]/.matcher(raw).replaceAll('').trim();` +
    `for (def word : /[\\s,=]+/.split(cleaned)) {` +
    `def t = word.trim().toLowerCase(Locale.ROOT);` +
    `if (!t.isEmpty()) { emit(t); }` +
    `}` +
    `}` +
    `}` +
    `}`
  );
};

/**
 * Builds ES query clauses that check for the existence of extended fields
 * (field has any value), scoped to the correct template versions.
 * Uses the flattened mapping directly when possible, falling back to
 * runtime fields for controls that need scripts.
 * All clauses are OR'd — any matching label is sufficient.
 */
export const buildFieldLabelExistsClauses = (
  resolvedLabels: ResolvedFieldLabelFilter[]
): estypes.QueryDslQueryContainer[] =>
  resolvedLabels.flatMap((resolved): estypes.QueryDslQueryContainer[] => {
    const fieldName = needsRuntimeScript(resolved.control, resolved.esType)
      ? `ef_${resolved.storageKey}`
      : `${FLATTENED_FIELD_PATH}.${resolved.storageKey}`;

    const existsClause: estypes.QueryDslQueryContainer = {
      exists: { field: fieldName },
    };

    return [
      { bool: { filter: [existsClause, buildTemplateVersionFilter(resolved.templateVersions)] } },
    ];
  });
