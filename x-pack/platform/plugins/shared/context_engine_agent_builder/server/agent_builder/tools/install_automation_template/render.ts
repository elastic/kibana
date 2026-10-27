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
import CONTEXT_ENGINE_MEMORY_PROMOTION_TEMPLATE from './memory_promotion_template.yaml.text';
import CONTEXT_ENGINE_TRACE_MEMORY_EXTRACTION_TEMPLATE from './trace_memory_extraction_template.yaml.text';
import CONTEXT_ENGINE_MEMORY_DISTILLATION_TEMPLATE from './memory_distillation_template.yaml.text';
import CONTEXT_ENGINE_MEMORY_EXTRACTION_TEMPLATE from './memory_extraction_template.yaml.text';
import CONTEXT_ENGINE_MEMORY_MAINTENANCE_TEMPLATE from './memory_maintenance_template.yaml.text';
import {
  buildMemoryExtractionTokens,
  compileMemoryCustomExtractionConfig,
  compileMemoryExtractionConfig,
  type ExtractionSource,
  type MemoryCustomExtractionConfig,
  type MemoryExtractionConfig,
} from './memory_extraction';

const DEFAULT_EXTRACTION_SOURCES: ExtractionSource[] = [{ type: 'short_term_memory' }];

export type AutomationTemplateId =
  | 'document_orchestration'
  | 'index_metadata'
  | 'unit_profile'
  | 'targeted_ki_writer'
  | 'memory_promotion'
  | 'trace_memory_extraction'
  | 'memory_distillation'
  | 'memory_extraction'
  | 'memory_custom_extraction'
  | 'memory_maintenance';

/** Stable tag written into each installed workflow so a later call updates that workflow. */
export const AUTOMATION_TEMPLATE_TAGS: Record<AutomationTemplateId, string> = {
  document_orchestration: 'ce-template:document_orchestration',
  index_metadata: 'ce-template:index_metadata',
  unit_profile: 'ce-template:unit_profile',
  targeted_ki_writer: 'ce-template:targeted_ki_writer',
  memory_promotion: 'ce-template:memory_promotion',
  trace_memory_extraction: 'ce-template:trace_memory_extraction',
  memory_distillation: 'ce-template:memory_distillation',
  memory_extraction: 'ce-template:memory_extraction',
  memory_custom_extraction: 'ce-template:memory_custom_extraction',
  memory_maintenance: 'ce-template:memory_maintenance',
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

/** A workflow schedule interval in minutes, hours or days, such as `1h`. */
export const SCHEDULE_INTERVAL_PATTERN = /^[1-9][0-9]{0,3}[mhd]$/;

const assertScheduleInterval = (interval: string): void => {
  if (!SCHEDULE_INTERVAL_PATTERN.test(interval)) {
    throw new Error(
      `Interval "${interval}" must be a number of minutes, hours or days, such as "1h".`
    );
  }
};

export interface MemoryPromotionTemplateValues {
  aiIndexId: string;
  automationName: string;
  /** Agents whose users' short-term memories feed the AI index. Empty reads every agent. */
  agentIds: readonly string[];
  batchSize: number;
  interval: string;
}

export interface TraceMemoryExtractionTemplateValues {
  aiIndexId: string;
  automationName: string;
  lookbackHours: number;
  maxRows: number;
  interval: string;
}

export interface MemoryDistillationTemplateValues {
  aiIndexId: string;
  automationName: string;
  maxMemories: number;
  purgeAfterDays: number;
  interval: string;
}

/**
 * The AI index id is also spliced into the workflow's concurrency key, unquoted. AI index ids are
 * restricted to a safe character set when written, so this only guards against a bypass.
 */
const rawAiIndexId = (aiIndexId: string): string => {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(aiIndexId)) {
    throw new Error(`AI index id "${aiIndexId}" cannot be used in a workflow concurrency key.`);
  }
  return aiIndexId;
};

export const renderMemoryPromotionTemplate = (values: MemoryPromotionTemplateValues): string => {
  assertScheduleInterval(values.interval);
  return replaceTokens(CONTEXT_ENGINE_MEMORY_PROMOTION_TEMPLATE, {
    __AI_INDEX_ID__: yamlString(values.aiIndexId),
    __AI_INDEX_ID_RAW__: rawAiIndexId(values.aiIndexId),
    __AUTOMATION_NAME__: yamlString(values.automationName),
    // JSON is valid YAML flow syntax, so the list renders on the const's own line.
    __AGENT_IDS__: JSON.stringify(values.agentIds),
    __BATCH_SIZE__: String(values.batchSize),
    __INTERVAL__: yamlString(values.interval),
  });
};

export const renderTraceMemoryExtractionTemplate = (
  values: TraceMemoryExtractionTemplateValues
): string => {
  assertScheduleInterval(values.interval);
  return replaceTokens(CONTEXT_ENGINE_TRACE_MEMORY_EXTRACTION_TEMPLATE, {
    __AI_INDEX_ID__: yamlString(values.aiIndexId),
    __AI_INDEX_ID_RAW__: rawAiIndexId(values.aiIndexId),
    __AUTOMATION_NAME__: yamlString(values.automationName),
    __LOOKBACK_HOURS__: String(values.lookbackHours),
    __MAX_ROWS__: String(values.maxRows),
    __INTERVAL__: yamlString(values.interval),
  });
};

export const renderMemoryDistillationTemplate = (
  values: MemoryDistillationTemplateValues
): string => {
  assertScheduleInterval(values.interval);
  return replaceTokens(CONTEXT_ENGINE_MEMORY_DISTILLATION_TEMPLATE, {
    __AI_INDEX_ID__: yamlString(values.aiIndexId),
    __AI_INDEX_ID_RAW__: rawAiIndexId(values.aiIndexId),
    __AUTOMATION_NAME__: yamlString(values.automationName),
    __MAX_MEMORIES__: String(values.maxMemories),
    __PURGE_AFTER_DAYS__: String(values.purgeAfterDays),
    __INTERVAL__: yamlString(values.interval),
  });
};

export interface MemoryMaintenanceTemplateValues {
  aiIndexId: string;
  /** Agents whose users' short-term memories are maintained. Empty maintains every agent's. */
  agentIds: readonly string[];
  unusedDays: number;
  maxOwners: number;
  maxMemories: number;
  interval: string;
}

const INTERVAL_UNIT_HOURS: Record<string, number> = { m: 1 / 60, h: 1, d: 24 };

/** Twice the interval, so a late or dropped run doesn't leave changes unvisited. */
export const maintenanceLookbackHours = (interval: string): number => {
  assertScheduleInterval(interval);
  const hours = Number(interval.slice(0, -1)) * INTERVAL_UNIT_HOURS[interval.slice(-1)];
  return Math.min(Math.max(Math.ceil(hours * 2), 1), 24 * 365);
};

export const renderMemoryMaintenanceTemplate = (values: MemoryMaintenanceTemplateValues): string =>
  replaceTokens(CONTEXT_ENGINE_MEMORY_MAINTENANCE_TEMPLATE, {
    __AI_INDEX_ID_RAW__: rawAiIndexId(values.aiIndexId),
    // JSON is valid YAML flow syntax, so the list renders on the const's own line.
    __AGENT_IDS__: JSON.stringify(values.agentIds),
    __UNUSED_DAYS__: String(values.unusedDays),
    __LOOKBACK_HOURS__: String(maintenanceLookbackHours(values.interval)),
    __MAX_OWNERS__: String(values.maxOwners),
    __MAX_MEMORIES__: String(values.maxMemories),
    __INTERVAL__: yamlString(values.interval),
  });

interface ExtractionTemplateBaseValues {
  aiIndexId: string;
  /** Agents whose users' short-term memories feed the AI index. Empty reads every agent. */
  agentIds: readonly string[];
  batchSize: number;
  interval: string;
  /** Where records are read from. Defaults to short-term memory. */
  sources?: ExtractionSource[];
}

export interface MemoryExtractionTemplateValues extends ExtractionTemplateBaseValues {
  config: MemoryExtractionConfig;
}

export interface MemoryCustomExtractionTemplateValues extends ExtractionTemplateBaseValues {
  config: MemoryCustomExtractionConfig;
}

const renderExtractionTemplate = (
  values: ExtractionTemplateBaseValues,
  templateTag: string,
  configTokens: Record<string, string>
): string => {
  assertScheduleInterval(values.interval);
  return replaceTokens(CONTEXT_ENGINE_MEMORY_EXTRACTION_TEMPLATE, {
    __AI_INDEX_ID__: yamlString(values.aiIndexId),
    __AI_INDEX_ID_RAW__: rawAiIndexId(values.aiIndexId),
    __AGENT_IDS__: JSON.stringify(values.agentIds),
    __BATCH_SIZE__: String(values.batchSize),
    __INTERVAL__: yamlString(values.interval),
    __TEMPLATE_TAG__: templateTag,
    ...configTokens,
  });
};

export const renderMemoryExtractionTemplate = (values: MemoryExtractionTemplateValues): string =>
  renderExtractionTemplate(
    values,
    AUTOMATION_TEMPLATE_TAGS.memory_extraction,
    buildMemoryExtractionTokens(
      values.config,
      compileMemoryExtractionConfig(values.config),
      values.sources ?? DEFAULT_EXTRACTION_SOURCES
    )
  );

export const renderMemoryCustomExtractionTemplate = (
  values: MemoryCustomExtractionTemplateValues
): string =>
  renderExtractionTemplate(
    values,
    AUTOMATION_TEMPLATE_TAGS.memory_custom_extraction,
    buildMemoryExtractionTokens(
      values.config,
      compileMemoryCustomExtractionConfig(values.config),
      values.sources ?? DEFAULT_EXTRACTION_SOURCES
    )
  );

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
