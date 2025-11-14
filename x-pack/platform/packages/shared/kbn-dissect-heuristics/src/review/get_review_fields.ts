/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { DissectPattern } from '../types';

export type ReviewFields = Record<
  string,
  {
    example_values: string[];
    position: number;
  }
>;

/**
 * Generates an object of fields with their example values and positions
 * for LLM review and ECS field mapping.
 */
export function getReviewFields(pattern: DissectPattern, numExamples = 5): ReviewFields {
  return pattern.fields.reduce<ReviewFields>((reviewFields, field) => {
    // Skip empty/skip fields
    if (!field.modifiers?.skip) {
      reviewFields[field.name] = {
        example_values: uniq(field.values).slice(0, numExamples),
        position: field.position,
      };
    }
    return reviewFields;
  }, {});
}

/**
 * Result from LLM review of dissect fields where ECS field names have already been mapped to OpenTelemetry fields.
 */
export interface NormalizedReviewResult {
  log_source: string;
  fields: Array<{
    ecs_field: string;
    columns: string[];
    join_strategy: 'append' | 'skip';
    is_static?: boolean;
    static_value?: string;
  }>;
}
