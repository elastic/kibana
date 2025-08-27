/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { GrokPatternNode } from '../types';
import { COLLAPSIBLE_PATTERNS } from '../constants';
import { isNamedField } from '../utils';

export type ReviewFields = Record<
  string,
  {
    grok_component: string;
    example_values: string[];
  }
>;

/**
 * Generates an object of fields with their corresponding GROK component and example values.
 */
export function getReviewFields(nodes: GrokPatternNode[], numExamples = 5) {
  return nodes.reduce<ReviewFields>((reviewFields, node) => {
    if (isNamedField(node)) {
      reviewFields[node.id] = {
        grok_component: node.component,
        example_values: uniq(node.values).slice(0, numExamples),
      };
    }
    return reviewFields;
  }, {});
}

/**
 * Result from LLM review of fields where ECS field names have already been mapped to OpenTelemetry fields.
 *
 * Example value:
 *
 * ```json
 * {
 *     "log_source": "Apache HTTP Server Log",
 *     "fields": [
 *         {
 *             "name": "@timestamp",
 *             "columns": ["field_0", "field_1", "field_2"],
 *             "grok_components": ["DAY", "SYSLOGTIMESTAMP", "YEAR"]
 *         },
 *         {
 *             "name": "log.level",
 *             "columns": ["field_3"],
 *             "grok_components": ["LOGLEVEL"]
 *         },
 *         {
 *             "name": "message",
 *             "columns": ["field_4"],
 *             "grok_components": ["GREEDYDATA"]
 *         }
 *     ]
 * }
 * ```
 */
export interface NormalizedReviewResult {
  log_source: string;
  fields: Array<{
    name: string;
    columns: string[];
    grok_components: string[];
  }>;
}

export function isCollapsiblePattern(pattern: string) {
  return COLLAPSIBLE_PATTERNS.includes(pattern);
}

export function sanitize(value: string) {
  return value.replaceAll(/[\.\[\]\{\}]/g, '\\$&');
}
