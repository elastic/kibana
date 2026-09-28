/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONTEXT_ENGINE_DOCUMENT_ORCHESTRATION_TEMPLATE,
  CONTEXT_ENGINE_DOCUMENT_SUMMARY_WORKFLOW_ID,
  CONTEXT_ENGINE_INDEX_METADATA_TEMPLATE,
  CONTEXT_ENGINE_UNIT_PROFILE_TEMPLATE,
} from '@kbn/workflows/managed';

export type AutomationTemplateId = 'document_orchestration' | 'index_metadata' | 'unit_profile';

/** Stable tag written into each installed workflow so a later call updates that workflow. */
export const AUTOMATION_TEMPLATE_TAGS: Record<AutomationTemplateId, string> = {
  document_orchestration: 'ce-template:document_orchestration',
  index_metadata: 'ce-template:index_metadata',
  unit_profile: 'ce-template:unit_profile',
};

export interface DocumentOrchestrationTemplateValues {
  aiIndexId: string;
  sourceIndex: string;
  titleField: string;
  bodyField: string;
  corpusFilter: string;
  maxDocuments: number;
  bodyMaxChars: number;
}

export interface UnitProfileTemplateValues {
  aiIndexId: string;
  unitIndex: string;
  unitKey: string;
  activityField: string;
  breakdownField: string;
  /** Index holding one record per unit. Equal to `unitIndex` when there is no separate record. */
  catalogIndex: string;
  catalogKey: string;
  /** A complete ES|QL line beginning with `| WHERE`, or empty to take every unit. */
  discoveryFilter: string;
  metricFields: string[];
  maxUnits: number;
}

export interface IndexMetadataTemplateValues {
  aiIndexId: string;
  sourceIndex: string;
  categoryField: string;
}

const yamlString = (value: string): string => JSON.stringify(value);

/**
 * Index and field names reach ES|QL inside backticks and reach Liquid unescaped, so a backtick or
 * a brace pair in one would change the query the workflow runs rather than fail it.
 */
export const assertSafeIdentifier = (label: string, value: string): void => {
  if (/[`\r\n]/.test(value) || value.includes('{{') || value.includes('}}')) {
    throw new Error(
      `${label} "${value}" contains a backtick, a line break or a Liquid brace pair, which an ES|QL identifier cannot carry.`
    );
  }
};

/** An ES|QL column name derived from a field name, unique within one rendered query. */
const metricColumnName = (field: string, taken: Set<string>): string => {
  const slug = field
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const base = `avg_${slug === '' ? 'metric' : slug}`;
  let column = base;
  for (let suffix = 2; taken.has(column); suffix++) {
    column = `${base}_${suffix}`;
  }
  taken.add(column);
  return column;
};

/** The orchestration splices this between FROM and the next pipe. A bare WHERE is not valid there. */
const corpusFilterLine = (filter: string): string => {
  const trimmed = filter.trim();
  if (trimmed === '' || trimmed.startsWith('|')) {
    return trimmed;
  }
  return `| ${trimmed}`;
};

const replaceTokens = (template: string, tokens: Record<string, string>): string =>
  template.replace(/__[A-Z0-9_]+__/g, (token) => {
    const value = tokens[token];
    if (value === undefined) {
      throw new Error(
        `Automation template defines ${token}, and the renderer has no value for it.`
      );
    }
    return value;
  });

export const renderDocumentOrchestrationTemplate = (
  values: DocumentOrchestrationTemplateValues
): string => {
  assertSafeIdentifier('sourceIndex', values.sourceIndex);
  assertSafeIdentifier('titleField', values.titleField);
  assertSafeIdentifier('bodyField', values.bodyField);

  return replaceTokens(CONTEXT_ENGINE_DOCUMENT_ORCHESTRATION_TEMPLATE, {
    __AI_INDEX_ID__: yamlString(values.aiIndexId),
    __SOURCE_INDEX__: yamlString(values.sourceIndex),
    __TITLE_FIELD__: yamlString(values.titleField),
    __BODY_FIELD__: yamlString(values.bodyField),
    __CORPUS_FILTER__: yamlString(corpusFilterLine(values.corpusFilter)),
    __MAX_DOCUMENTS__: String(values.maxDocuments),
    __BODY_MAX_CHARS__: String(values.bodyMaxChars),
    __DOCUMENT_SUMMARY_WORKFLOW_ID__: yamlString(CONTEXT_ENGINE_DOCUMENT_SUMMARY_WORKFLOW_ID),
  });
};

/** Units per discovery page. A run covers `pages * UNIT_PAGE_SIZE` units at most. */
const UNIT_PAGE_SIZE = 50;

/**
 * The discovery filter is spliced into ES|QL as written, so it is bounded to a single `| WHERE`
 * line and kept clear of Liquid, which the workflow engine would expand before the query runs.
 */
const assertSafeDiscoveryFilter = (filter: string): void => {
  if (filter === '') {
    return;
  }
  if (!filter.startsWith('| WHERE ')) {
    throw new Error(
      `discoveryFilter "${filter}" must be empty or a complete ES|QL line beginning with "| WHERE ".`
    );
  }
  if (/[\r\n]/.test(filter) || filter.includes('{{') || filter.includes('}}')) {
    throw new Error(
      `discoveryFilter "${filter}" contains a line break or a Liquid brace pair, neither of which belongs in a discovery filter.`
    );
  }
};

export const renderUnitProfileTemplate = (values: UnitProfileTemplateValues): string => {
  assertSafeIdentifier('unitIndex', values.unitIndex);
  assertSafeIdentifier('unitKey', values.unitKey);
  assertSafeIdentifier('activityField', values.activityField);
  assertSafeIdentifier('breakdownField', values.breakdownField);
  assertSafeIdentifier('catalogIndex', values.catalogIndex);
  assertSafeIdentifier('catalogKey', values.catalogKey);
  for (const field of values.metricFields) {
    assertSafeIdentifier('metricFields entry', field);
  }

  const discoveryFilter = values.discoveryFilter.trim();
  assertSafeDiscoveryFilter(discoveryFilter);

  // `unit_metrics` reads `unit_totals` by column position, and the template already defines four
  // columns, so an appended metric starts at column 4.
  const fixedColumns = ['doc_count', 'distinct_breakdown', 'first_seen', 'last_seen'];
  const taken = new Set<string>(fixedColumns);
  const metrics = values.metricFields.map((field, index) => ({
    field,
    column: metricColumnName(field, taken),
    position: fixedColumns.length + index,
  }));

  const batchSize = Math.min(values.maxUnits, UNIT_PAGE_SIZE);

  return replaceTokens(CONTEXT_ENGINE_UNIT_PROFILE_TEMPLATE, {
    __AI_INDEX_ID__: yamlString(values.aiIndexId),
    __UNIT_INDEX__: yamlString(values.unitIndex),
    __UNIT_KEY__: yamlString(values.unitKey),
    __ACTIVITY_FIELD__: yamlString(values.activityField),
    __BREAKDOWN_FIELD__: yamlString(values.breakdownField),
    __CATALOG_INDEX__: yamlString(values.catalogIndex),
    __CATALOG_KEY__: yamlString(values.catalogKey),
    __DISCOVERY_FILTER__: yamlString(discoveryFilter),
    __BATCH_SIZE__: String(batchSize),
    __MAX_PAGES__: String(Math.ceil(values.maxUnits / batchSize)),
    __METRIC_STATS__: metrics
      .map(({ field, column }) => `,\n                        ${column} = AVG(\`${field}\`)`)
      .join(''),
    // Anchored to a comment line in the template, so the unrendered YAML still parses.
    __METRIC_SETS__: metrics
      .map(
        ({ column, position }) =>
          `\n              ${column}: "{{ steps.unit_totals.output.values[0][${position}] }}"`
      )
      .join(''),
    __METRIC_COLUMNS__: metrics
      .map(({ field, column }) => `, ${column} (AVG of ${field})`)
      .join(''),
    __METRIC_LINES__: metrics
      .map(
        ({ field, column }) =>
          `\n                  - Average ${field}: {{ steps.unit_metrics.output.${column} }}`
      )
      .join(''),
  });
};

export const renderIndexMetadataTemplate = (values: IndexMetadataTemplateValues): string => {
  assertSafeIdentifier('sourceIndex', values.sourceIndex);
  assertSafeIdentifier('categoryField', values.categoryField);

  return replaceTokens(CONTEXT_ENGINE_INDEX_METADATA_TEMPLATE, {
    __AI_INDEX_ID__: yamlString(values.aiIndexId),
    __SOURCE_INDEX__: yamlString(values.sourceIndex),
    __CATEGORY_FIELD__: yamlString(values.categoryField),
  });
};
