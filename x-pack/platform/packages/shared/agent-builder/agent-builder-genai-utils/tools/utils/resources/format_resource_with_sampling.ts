/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';
import type { ResolvedResourceWithSampling } from './resolve_resource_with_sampling_stats';
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
 *   path (type) [description][: val1, val2]
 */
export const formatResourceWithSampledValues = ({
  resource,
}: {
  resource: ResolvedResourceWithSampling;
}) => {
  const samplingCount = resource.fields.length > 1000 ? 0 : resource.fields.length > 200 ? 1 : 2;
  const lines = resource.fields.map((field) => renderFieldLine(field, samplingCount));
  return [
    `<target_resource name="${resource.name}" type="${resource.type}">`,
    ...lines,
    `</target_resource>`,
  ].join('\n');
};

const renderFieldLine = (field: MappingFieldWithStats, samplingCount: number): string => {
  const description = field.meta.description ? ` ${field.meta.description}` : '';
  const samples =
    SAMPLE_VALUE_TYPES.has(field.type) && field.stats.values.length && samplingCount > 0
      ? ` (${take(field.stats.values, samplingCount)
          .map((v) => truncate(normalizeSpaces(`${v.value}`), 80))
          .join(', ')}...)`
      : '';
  return `- ${field.path} [${field.type}]${description}${samples}`;
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
