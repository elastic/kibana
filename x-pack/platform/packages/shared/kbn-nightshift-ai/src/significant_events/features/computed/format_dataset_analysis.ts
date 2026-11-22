/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, sumBy } from 'lodash';
import type { DocumentAnalysis } from '@kbn/ai-tools';

type AnalyzedField = DocumentAnalysis['fields'][number];
type FieldValue = AnalyzedField['values'][number];

export interface FieldConflict {
  types: string[];
  suggestedCast?: string;
}

export interface FormattedDatasetAnalysis {
  total: number;
  sampled: number;
  fields: Record<string, string[]>;
  constant_fields?: Record<string, string>;
  other_fields?: string[];
}

// Fields the query generation prompt reasons on, in listing order.
const KEY_FIELDS = [
  'message',
  'body.text',
  'log.level',
  'severity_text',
  'event.severity',
  'level',
  'service.name',
  'error.type',
  'error.message',
  'error.code',
  'exception.type',
  'exception.message',
  'error.exception.type',
  'error.exception.message',
  'event.outcome',
  'authentication.result',
  'status.code',
  'http.response.status_code',
  'http.status_code',
  'status_code',
  'event.duration',
  'transaction.duration.us',
  'span.duration.us',
  'duration',
  'event.dataset',
  'data_stream.dataset',
];
const KEY_FIELD_PREFIXES = ['', 'attributes.', 'resource.attributes.'];
const KEY_FIELD_RANK = new Map(
  KEY_FIELDS.flatMap((name, index) =>
    KEY_FIELD_PREFIXES.map((prefix, prefixIndex): [string, number] => [
      `${prefix}${name}`,
      index * KEY_FIELD_PREFIXES.length + prefixIndex,
    ])
  )
);

const STATUS_CODE_FIELD = /(^|[._])status_?code$/i;
const STATUS_CODE_RANK = (KEY_FIELDS.indexOf('status_code') + 1) * KEY_FIELD_PREFIXES.length - 0.5;

// Collector and machine bookkeeping: rarely worth a predicate, so listed by name only.
const BOOKKEEPING_FIELDS =
  /^(agent\.|elastic_agent\.|ecs\.version$|input\.type$|log\.offset$|kubernetes\.node\.labels\.|aws\.tags\.)/;

const TEXT_TYPES = new Set(['text', 'match_only_text']);
const DATE_TYPES = new Set(['date', 'date_nanos']);
const NUMERIC_TYPES = new Set([
  'long',
  'integer',
  'short',
  'byte',
  'unsigned_long',
  'double',
  'float',
  'half_float',
  'scaled_float',
]);

const MAX_VALUES = 5;
const MAX_KEY_VALUES = 10;
const MAX_TEXT_VALUES = 2;
const MIN_EXAMPLES = 2;
const MIN_VALUE_SHARE = 0.01;
const MIN_NUMERIC_VALUE_SHARE = 0.05;
// With fewer values, splitting the sample the same way can be a coincidence.
const MIN_CORRELATED_CARDINALITY = MAX_VALUES + 1;
const VALUE_LENGTH_LIMIT = 200;
const CONSTANT_VALUE_LENGTH_LIMIT = 80;
// Keeps range-summarised numeric fields (latencies) above near-constant flags.
const NUMERIC_RANGE_SCORE = 0.5;

const FIELDS_BUDGET_CHARS = 8000;
const CONSTANT_FIELDS_BUDGET_CHARS = 1500;
const OTHER_FIELDS_BUDGET_CHARS = 2500;
const MIN_FAMILY_SIZE = 4;

const NO_VALUE_LABEL = '(no value)';
// Left out of names-only labels: most fields are keywords.
const KEYWORD_SUFFIX = ' (keyword)';

interface FieldGroup {
  key: string;
  names: string[];
  field: AnalyzedField;
  keyRank: number;
  isBookkeeping: boolean;
  isConstant: boolean;
  isRare: boolean;
}

interface Summary {
  lines: string[];
  score: number;
}

/** Formats a document analysis for an LLM under a character budget, key fields first. */
export const formatDatasetAnalysis = (
  analysis: DocumentAnalysis,
  { conflicts = {} }: { conflicts?: Record<string, FieldConflict> } = {}
): FormattedDatasetAnalysis => {
  const { total, sampled } = analysis;
  const groups = groupFields(
    analysis.fields.filter((field) => !field.empty),
    sampled,
    conflicts
  );

  const isKey = ({ keyRank }: FieldGroup) => keyRank < Infinity;
  const keyGroups = groups.filter(isKey).sort((a, b) => a.keyRank - b.keyRank);
  const fields: Array<[string, string[]]> = keyGroups.map((group) => [
    group.key,
    summarize(group, sampled).lines,
  ]);

  // Groups splitting the sample the same way map one-to-one, so one distribution serves them all.
  const units = Object.values(
    groupBy(
      groups.filter(
        ({ isBookkeeping, isConstant, isRare }) => !isBookkeeping && !isConstant && !isRare
      ),
      ({ key, field }) =>
        field.partition && (field.cardinality ?? 0) >= MIN_CORRELATED_CARDINALITY
          ? field.partition
          : `key:${key}`
    )
  ).flatMap((members) => {
    const [leader, ...followers] = [...members].sort(
      (a, b) => a.keyRank - b.keyRank || a.key.length - b.key.length || compareNames(a, b)
    );
    const summary = summarize(leader, sampled);
    const entries: Array<[string, string[]]> = [
      ...(isKey(leader) ? [] : [[leader.key, summary.lines] as [string, string[]]]),
      ...followers
        .filter((follower) => !isKey(follower))
        .map((follower): [string, string[]] => [
          follower.key,
          summarizeFollower(follower, leader, sampled),
        ]),
    ];
    return entries.length > 0
      ? [
          {
            leader,
            members: members.filter((member) => !isKey(member)),
            entries,
            score: summary.score,
          },
        ]
      : [];
  });
  units.sort((a, b) => b.score - a.score || compareNames(a.leader, b.leader));

  const unlisted: FieldGroup[] = groups.filter(
    (group) => (group.isBookkeeping || group.isRare) && !isKey(group)
  );
  let fieldsBudget = FIELDS_BUDGET_CHARS;
  for (const { members, entries } of units) {
    const size = sumBy(entries, ([key, lines]) => entrySize(key, lines));
    if (size <= fieldsBudget) {
      fieldsBudget -= size;
      fields.push(...entries);
    } else {
      unlisted.push(...members);
    }
  }

  const constantFields: Array<[string, string]> = [];
  let constantsBudget = CONSTANT_FIELDS_BUDGET_CHARS;
  const constants = groups
    .filter((group) => !group.isBookkeeping && group.isConstant && !isKey(group))
    .sort(compareNames);
  for (const group of constants) {
    const value = truncate(String(group.field.values[0].value), CONSTANT_VALUE_LENGTH_LIMIT);
    const size = entrySize(group.key, value);
    if (size <= constantsBudget) {
      constantsBudget -= size;
      constantFields.push([group.key, value]);
    } else {
      unlisted.push(group);
    }
  }

  const otherFields = listByName(unlisted);

  return {
    total,
    sampled,
    fields: Object.fromEntries(fields),
    ...(constantFields.length > 0 ? { constant_fields: Object.fromEntries(constantFields) } : {}),
    ...(otherFields.length > 0 ? { other_fields: otherFields } : {}),
  };
};

const groupFields = (
  fields: AnalyzedField[],
  sampled: number,
  conflicts: Record<string, FieldConflict>
): FieldGroup[] => {
  const byFingerprint = groupBy(fields, ({ name, fingerprint }) => fingerprint ?? `name:${name}`);

  return Object.values(byFingerprint).map((members) => {
    const sorted = [...members].sort(
      (a, b) =>
        keyRankOf(a) - keyRankOf(b) || a.name.length - b.name.length || a.name.localeCompare(b.name)
    );
    const [first] = sorted;
    // Text fields show fewer values, so a non-text copy carries the group's summary.
    const field = sorted.find(({ types }) => !types.some((type) => TEXT_TYPES.has(type))) ?? first;

    return {
      key: sorted.map((member) => fieldLabel(member, conflicts[member.name])).join(' = '),
      names: sorted.map(({ name }) => name),
      field,
      keyRank: keyRankOf(first),
      isBookkeeping: sorted.every(({ name }) => BOOKKEEPING_FIELDS.test(name)),
      isConstant: first.cardinality === 1 && first.documentsWithValue === sampled,
      isRare: first.documentsWithValue < MIN_VALUE_SHARE * sampled,
    };
  });
};

const keyRankOf = ({ name }: AnalyzedField): number =>
  KEY_FIELD_RANK.get(name) ?? (STATUS_CODE_FIELD.test(name) ? STATUS_CODE_RANK : Infinity);

const compareNames = (a: FieldGroup, b: FieldGroup): number => a.key.localeCompare(b.key);

const fieldLabel = ({ name, types }: AnalyzedField, conflict?: FieldConflict): string => {
  if (conflict) {
    const conflictTypes = conflict.types.join(', ');
    // Without a suggested cast ES could not resolve the union, so no cast is safe.
    return conflict.suggestedCast
      ? `${name} (${conflictTypes} - recommended: ${conflict.suggestedCast})`
      : `${name} (${conflictTypes} - ambiguous, no safe cast)`;
  }

  return types.length > 0 ? `${name} (${types.join(', ')})` : `${name} (unmapped - no type)`;
};

const summarizeFollower = (follower: FieldGroup, leader: FieldGroup, sampled: number): string[] => {
  const [top] = sortValues(follower.field.values);
  return [
    formatShare(truncate(String(top.value), VALUE_LENGTH_LIMIT), top.count, sampled),
    `one value per ${leader.names[0]}`,
  ];
};

const sortValues = (values: FieldValue[]): FieldValue[] =>
  [...values].sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));

const summarize = ({ field, keyRank }: FieldGroup, sampled: number): Summary => {
  const values = sortValues(field.values);
  const isNumeric = field.types.length > 0 && field.types.every((type) => NUMERIC_TYPES.has(type));
  const maxValues = field.types.some((type) => DATE_TYPES.has(type))
    ? 0
    : field.types.some((type) => TEXT_TYPES.has(type))
    ? MAX_TEXT_VALUES
    : keyRank < Infinity
    ? MAX_KEY_VALUES
    : MAX_VALUES;

  const minShare = isNumeric ? MIN_NUMERIC_VALUE_SHARE : MIN_VALUE_SHARE;
  const frequent =
    values.length <= maxValues
      ? values
      : values.filter(({ count }) => count >= minShare * sampled).slice(0, maxValues);
  const hasRange = isNumeric && values.length > frequent.length && maxValues > 0;
  const shown =
    hasRange || frequent.length >= MIN_EXAMPLES
      ? frequent
      : values.slice(0, Math.min(MIN_EXAMPLES, maxValues));

  const lines = shown.map(({ value, count }) =>
    formatShare(truncate(String(value), VALUE_LENGTH_LIMIT), count, sampled)
  );
  if (maxValues > 0 && values.length > shown.length) {
    lines.push(`... (+${values.length - shown.length} more)`);
  }
  if (hasRange) {
    lines.push(formatRange(values));
  }

  const documentsWithoutValue = Math.max(sampled - field.documentsWithValue, 0);
  if (documentsWithoutValue > 0) {
    lines.push(formatShare(NO_VALUE_LABEL, documentsWithoutValue, sampled));
  }

  const entropy = sumBy([...frequent.map(({ count }) => count), documentsWithoutValue], (count) =>
    count > 0 && count < sampled ? -(count / sampled) * Math.log2(count / sampled) : 0
  );

  return { lines, score: hasRange ? Math.max(entropy, NUMERIC_RANGE_SCORE) : entropy };
};

const formatShare = (label: string, count: number, sampled: number): string => {
  const percentage = sampled > 0 ? (count / sampled) * 100 : 0;
  if (percentage > 0 && percentage < 1) {
    return `${label} (<1%)`;
  }
  if (percentage > 99 && percentage < 100) {
    return `${label} (>99%)`;
  }
  return `${label} (${Math.round(percentage)}%)`;
};

const formatRange = (values: FieldValue[]): string => {
  const numbers = values
    .flatMap(({ value, count }) => (typeof value === 'number' ? [{ value, count }] : []))
    .sort((a, b) => a.value - b.value);
  if (numbers.length === 0) {
    return 'range: unknown';
  }

  const totalCount = sumBy(numbers, ({ count }) => count);
  const percentile = (fraction: number): number => {
    let seen = 0;
    for (const { value, count } of numbers) {
      seen += count;
      if (seen >= fraction * totalCount) {
        return value;
      }
    }
    return numbers[numbers.length - 1].value;
  };

  return `range: min ${numbers[0].value}, p50 ${percentile(0.5)}, p95 ${percentile(0.95)}, max ${
    numbers[numbers.length - 1].value
  }`;
};

const truncate = (value: string, limit: number): string =>
  value.length <= limit ? value : `${value.slice(0, limit)}...`;

const entrySize = (key: string, value: string | string[]): number =>
  JSON.stringify(key).length + JSON.stringify(value).length + 2;

const parentOf = (name: string, maxDepth: number): string =>
  name.split('.').slice(0, -1).slice(0, maxDepth).join('.');

const labelByName = (groups: FieldGroup[], maxDepth: number): string[] =>
  Object.entries(groupBy(groups, ({ names }) => parentOf(names[0], maxDepth)))
    .flatMap(([parent, members]) =>
      parent !== '' && members.length >= MIN_FAMILY_SIZE
        ? [`${parent}.* (${sumBy(members, ({ names }) => names.length)} fields)`]
        : members.map(({ key }) => key.replaceAll(KEYWORD_SUFFIX, ''))
    )
    .sort((a, b) => a.localeCompare(b));

const sizeOf = (labels: string[]): number =>
  sumBy(labels, (label) => JSON.stringify(label).length + 1);

// Families collapse at their deepest parent first, then higher up until the list fits.
const listByName = (groups: FieldGroup[]): string[] => {
  const candidates = [Infinity, 2, 1].map((maxDepth) => labelByName(groups, maxDepth));
  const labels =
    candidates.find((candidate) => sizeOf(candidate) <= OTHER_FIELDS_BUDGET_CHARS) ??
    candidates[candidates.length - 1];

  const kept: string[] = [];
  let budget = OTHER_FIELDS_BUDGET_CHARS;
  for (const label of labels) {
    const size = sizeOf([label]);
    if (size > budget) {
      return [...kept, `... (+${labels.length - kept.length} more)`];
    }
    budget -= size;
    kept.push(label);
  }
  return kept;
};
