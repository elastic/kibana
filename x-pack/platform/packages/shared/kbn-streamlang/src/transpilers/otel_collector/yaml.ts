/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  OtelFilterProcessorConfig,
  OtelProcessorConfig,
  OtelTransformProcessorConfig,
  OtelUnsupportedPlaceholder,
} from './types';

const INDENT = '  ';

/**
 * Serialize the OTel collector config to a ready-to-paste YAML fragment
 * containing `processors:` and a `service.pipelines.logs:` block.
 *
 * We hand-roll this rather than pulling in a YAML library: the shapes we emit
 * are constrained (processor configs and a service pipeline list) and the
 * alternative would add a new package dependency for very little gain.
 */
export const renderOtelConfigYaml = (
  processors: Record<string, OtelProcessorConfig>,
  pipelineProcessors: string[]
): string => {
  const lines: string[] = [];

  lines.push('processors:');
  if (Object.keys(processors).length === 0) {
    lines.push(`${INDENT}# no streamlang-emitted processors`);
  } else {
    for (const [name, config] of Object.entries(processors)) {
      if (isUnsupported(config)) {
        lines.push(
          `${INDENT}# streamlang: unsupported action "${config.action}" — ${config.reason}`
        );
        continue;
      }
      lines.push(`${INDENT}${quoteKey(name)}:`);
      if (isTransform(config)) {
        lines.push(...renderTransform(config, INDENT.repeat(2)));
      } else {
        lines.push(...renderFilter(config, INDENT.repeat(2)));
      }
    }
  }

  lines.push('service:');
  lines.push(`${INDENT}pipelines:`);
  lines.push(`${INDENT.repeat(2)}logs:`);
  lines.push(`${INDENT.repeat(3)}processors:`);
  if (pipelineProcessors.length === 0) {
    lines.push(`${INDENT.repeat(4)}# (no streamlang processors to run)`);
  } else {
    for (const name of pipelineProcessors) {
      const config = processors[name];
      if (config && isUnsupported(config)) {
        lines.push(`${INDENT.repeat(4)}# ${name} (unsupported; omitted from pipeline)`);
      } else {
        lines.push(`${INDENT.repeat(4)}- ${quoteKey(name)}`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
};

const renderTransform = (config: OtelTransformProcessorConfig, pad: string): string[] => {
  const out: string[] = [];
  out.push(`${pad}error_mode: ${config.error_mode}`);
  out.push(`${pad}log_statements:`);
  if (config.log_statements.length === 0) {
    out.push(`${pad}${INDENT}# (empty)`);
  } else {
    for (const statement of config.log_statements) {
      out.push(`${pad}${INDENT}- ${yamlString(statement)}`);
    }
  }
  return out;
};

const renderFilter = (config: OtelFilterProcessorConfig, pad: string): string[] => {
  const out: string[] = [];
  out.push(`${pad}error_mode: ${config.error_mode}`);
  out.push(`${pad}log_conditions:`);
  if (config.log_conditions.length === 0) {
    out.push(`${pad}${INDENT}# (empty)`);
  } else {
    for (const condition of config.log_conditions) {
      out.push(`${pad}${INDENT}- ${yamlString(condition)}`);
    }
  }
  return out;
};

const isTransform = (config: OtelProcessorConfig): config is OtelTransformProcessorConfig =>
  'log_statements' in config;

const isUnsupported = (config: OtelProcessorConfig): config is OtelUnsupportedPlaceholder =>
  '__streamlang_unsupported' in config && config.__streamlang_unsupported === true;

/**
 * Keys containing `/` or other non-plain-scalar characters need quoting so the
 * YAML parser treats them as a single key. Processor instance names like
 * `transform/streamlang` fall into this category.
 */
const quoteKey = (key: string): string => {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return key;
  return `"${key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
};

/**
 * Render a YAML string scalar. Uses double-quoted style so escape sequences
 * inside OTTL statements (quoted regex, etc.) are preserved unambiguously.
 */
const yamlString = (value: string): string => {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
};
