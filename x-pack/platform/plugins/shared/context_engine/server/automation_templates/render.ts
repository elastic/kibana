/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import CONTEXT_ENGINE_DOCUMENT_TEMPLATE from './document_template.yaml.text';
import CONTEXT_ENGINE_INDEX_METADATA_TEMPLATE from './index_metadata_template.yaml.text';
import CONTEXT_ENGINE_UNIT_PROFILE_TEMPLATE from './unit_profile_template.yaml.text';
import CONTEXT_ENGINE_TARGETED_KI_WRITER_TEMPLATE from './targeted_ki_writer_template.yaml.text';

export type AutomationTemplateId =
  | 'document_orchestration'
  | 'index_metadata'
  | 'unit_profile'
  | 'targeted_ki_writer';

/** Stable tag written into each installed workflow so a later call updates that workflow. */
export const AUTOMATION_TEMPLATE_TAGS: Record<AutomationTemplateId, string> = {
  document_orchestration: 'ce-template:document_orchestration',
  index_metadata: 'ce-template:index_metadata',
  unit_profile: 'ce-template:unit_profile',
  targeted_ki_writer: 'ce-template:targeted_ki_writer',
};

export interface DocumentOrchestrationTemplateValues {
  aiIndexId: string;
  /** Injected as `automation_name` in the workflow consts; used as the KI ID prefix. */
  automationName: string;
  sourceIndex: string;
  titleField: string;
  bodyField: string;
  corpusFilter: string;
  maxDocuments: number;
  bodyMaxChars: number;
}

export interface UnitProfileTemplateValues {
  aiIndexId: string;
  /** Injected as `automation_name` in the workflow consts; used as the KI ID prefix. */
  automationName: string;
  unitIndex: string;
  unitKey: string;
  activityField: string;
  breakdownField: string;
  /** A complete ES|QL line beginning with `| WHERE`, or empty to take every unit. */
  corpusFilter: string;
  /** Numeric fields averaged per unit, appended after the fixed `unit_totals` columns. */
  metricFields: readonly string[];
  maxUnits: number;
}

export interface IndexMetadataSource {
  index: string;
  categoryField: string;
}

export interface IndexMetadataTemplateValues {
  aiIndexId: string;
  /** Injected as `automation_name` in the workflow consts; prefixes each KI ID. */
  automationName: string;
  /** One `index_metadata` KI is written per source. */
  sources: readonly IndexMetadataSource[];
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

  return replaceTokens(CONTEXT_ENGINE_DOCUMENT_TEMPLATE, {
    __AI_INDEX_ID__: yamlString(values.aiIndexId),
    __AUTOMATION_NAME__: yamlString(values.automationName),
    __SOURCE_INDEX__: yamlString(values.sourceIndex),
    __TITLE_FIELD__: yamlString(values.titleField),
    __BODY_FIELD__: yamlString(values.bodyField),
    __CORPUS_FILTER__: yamlString(corpusFilterLine(values.corpusFilter)),
    __MAX_DOCUMENTS__: String(values.maxDocuments),
    __BODY_MAX_CHARS__: String(values.bodyMaxChars),
  });
};

export const renderUnitProfileTemplate = (values: UnitProfileTemplateValues): string => {
  assertSafeIdentifier('unitIndex', values.unitIndex);
  assertSafeIdentifier('unitKey', values.unitKey);
  assertSafeIdentifier('activityField', values.activityField);
  assertSafeIdentifier('breakdownField', values.breakdownField);
  for (const field of values.metricFields) {
    assertSafeIdentifier('metricFields', field);
  }

  return replaceTokens(CONTEXT_ENGINE_UNIT_PROFILE_TEMPLATE, {
    __AI_INDEX_ID__: yamlString(values.aiIndexId),
    __AUTOMATION_NAME__: yamlString(values.automationName),
    __UNIT_INDEX__: yamlString(values.unitIndex),
    __UNIT_KEY__: yamlString(values.unitKey),
    __ACTIVITY_FIELD__: yamlString(values.activityField),
    __BREAKDOWN_FIELD__: yamlString(values.breakdownField),
    __METRIC_FIELDS__: JSON.stringify(values.metricFields),
    __CORPUS_FILTER__: yamlString(corpusFilterLine(values.corpusFilter)),
    __MAX_UNITS__: String(values.maxUnits),
  });
};

export const renderIndexMetadataTemplate = (values: IndexMetadataTemplateValues): string => {
  if (values.sources.length === 0) {
    throw new Error('Index metadata needs at least one source to profile.');
  }

  const seen = new Set<string>();
  for (const { index, categoryField } of values.sources) {
    assertSafeIdentifier('sourceIndex', index);
    assertSafeIdentifier('categoryField', categoryField);
    if (seen.has(index)) {
      throw new Error(
        `Index "${index}" is listed twice. Each source writes the KI "<name>/${index}", so a second entry would overwrite the first.`
      );
    }
    seen.add(index);
  }

  return replaceTokens(CONTEXT_ENGINE_INDEX_METADATA_TEMPLATE, {
    __AI_INDEX_ID__: yamlString(values.aiIndexId),
    __AUTOMATION_NAME__: yamlString(values.automationName),
    // JSON is valid YAML flow syntax, so the list renders on the const's own line.
    __SOURCES__: JSON.stringify(
      values.sources.map(({ index, categoryField }) => ({
        index,
        category_field: categoryField,
      }))
    ),
  });
};

export interface TargetedKiWriterTemplateValues {
  aiIndexId: string;
  /**
   * The KI entries as a YAML-formatted string. Each entry must be a valid `- ki_id: / ki:` block.
   * Each line is indented 4 spaces (to sit under the `kis:` key at 2-space indent).
   */
  kis: string;
}

export const renderTargetedKiWriterTemplate = (values: TargetedKiWriterTemplateValues): string => {
  assertSafeIdentifier('aiIndexId', values.aiIndexId);
  // Indent every line of the kis block 4 spaces so it sits under `kis:` in the YAML.
  const indentedKis = values.kis
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : `    ${line}`))
    .join('\n');
  return replaceTokens(CONTEXT_ENGINE_TARGETED_KI_WRITER_TEMPLATE, {
    __AI_INDEX_ID__: yamlString(values.aiIndexId),
    __KIS__: indentedKis,
  });
};
