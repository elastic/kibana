/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';
import { escapeEsqlColumnName } from '@kbn/esql-utils';
import type { ResolvedResourceWithSampling } from './resolve_resource_for_esql_with_sampling_stats';
import type { MappingFieldWithStats } from '../sampling';

/**
 * Field types where sample values are meaningful for ES|QL query generation.
 * Numeric, date, boolean, and ip fields are excluded — their sampled values
 * do not constrain the query vocabulary and would only add token cost.
 */
const SAMPLE_VALUE_TYPES = new Set([
  'keyword',
  'constant_keyword',
  'wildcard',
  'text',
  'semantic_text',
  'match_only_text',
  'pattern_text',
]);

/**
 * Formats a resource with sampled field values as a compact plain-text block,
 * suitable for inclusion in a prompt.
 *
 * Each field is rendered as a single line:
 *   path (type[, ts_dimension][, ts_metric=<metric>]) [description][: val1, val2]
 */
export const formatResourceWithSampledValues = ({
  resource,
}: {
  resource: ResolvedResourceWithSampling;
}) => {
  const samplingCount = resource.fields.length > 1000 ? 0 : resource.fields.length > 200 ? 1 : 2;
  const lines = resource.fields.map((field) => renderFieldLine(field, samplingCount));
  const tsdbAttr = resource.isTsdb ? ` is-tsds="true"` : '';
  const definition = resource.query ? `definition: ${summarizeQuery(resource.query)}` : undefined;
  return [
    `<target_resource name="${resource.name}" type="${resource.type}"${tsdbAttr}>`,
    ...(definition ? [definition] : []),
    ...lines,
    `</target_resource>`,
  ].join('\n');
};

const VIEW_QUERY_PROMPT_LIMIT = 500;

const summarizeQuery = (query: string): string => {
  const singleLine = query.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= VIEW_QUERY_PROMPT_LIMIT) {
    return singleLine;
  }
  return `${singleLine.slice(0, VIEW_QUERY_PROMPT_LIMIT)}…`;
};

const renderFieldLine = (field: MappingFieldWithStats, samplingCount: number): string => {
  const description = field.meta.description ? ` ${field.meta.description}` : '';
  const samples =
    SAMPLE_VALUE_TYPES.has(field.type) && field.stats.values.length && samplingCount > 0
      ? ` (${take(field.stats.values, samplingCount)
          .map((v) => truncate(normalizeSpaces(`${v.value}`), 80))
          .join(', ')}...)`
      : '';
  return `- ${escapeEsqlColumnName(field.path)} [${renderTypeSegment(
    field
  )}]${description}${samples}`;
};

const renderTypeSegment = (field: MappingFieldWithStats): string => {
  const parts: string[] = [field.type];
  if (field.tsDimension === true) {
    parts.push('ts_dimension');
  }
  if (typeof field.tsMetric === 'string') {
    parts.push(`ts_metric=${field.tsMetric}`);
  }
  return parts.join(', ');
};

const truncate = (text: unknown, maxLength: number): string => {
  const str = String(text);
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '[truncated]';
};

const normalizeSpaces = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};
