/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CategorizationState } from '../../types';
import type { CategorizationBaseNodeParams } from './types';
import { ECS_EVENT_TYPES_PER_CATEGORY, EVENT_CATEGORIES, EVENT_TYPES } from './constants';

import type { EventCategories } from './constants';

export interface Event {
  type?: string[];
  category?: string[];
}

export interface PipelineResult {
  event?: Event;
}

interface CategorizationError {
  error: string;
}

export function handleCategorizationValidation({
  state,
}: CategorizationBaseNodeParams): Partial<CategorizationState> {
  let previousInvalidCategorization = '';
  const errors: CategorizationError[] = [];
  const pipelineResults = state.pipelineResults as PipelineResult[];
  if (Object.keys(state.invalidCategorization).length > 0) {
    previousInvalidCategorization = JSON.stringify(state.invalidCategorization, null, 2);
  }

  // Loops through the pipeline results to find invalid categories and types
  for (const doc of pipelineResults) {
    let types: string[] = [];
    let categories: string[] = [];
    if (doc?.event?.type) {
      types = doc.event.type;
    }
    if (doc?.event?.category) {
      categories = doc.event.category;
    }

    const invalidCategories = findInvalidCategories(categories);
    const invalidTypes = findInvalidTypes(types);

    if (invalidCategories.length > 0) {
      errors.push(createErrorMessage('event.category', invalidCategories, EVENT_CATEGORIES));
    }

    if (invalidTypes.length > 0) {
      errors.push(createErrorMessage('event.type', invalidTypes, EVENT_TYPES));
    }

    // Compatibility check is done only on valid categories and types
    const validCategories = categories.filter((x) => !invalidCategories.includes(x));
    const validTypes = types.filter((x) => !invalidTypes.includes(x));

    const compatibleErrors = getTypeCategoryIncompatibleError(validCategories, validTypes);
    for (const ce of compatibleErrors) {
      errors.push(ce);
    }
  }

  return {
    previousInvalidCategorization,
    invalidCategorization: errors,
    lastExecutedChain: 'handleCategorizationValidation',
  };
}

function createErrorMessage(
  field: string,
  errorList: string[],
  allowedValues: string[]
): CategorizationError {
  return {
    error: `field ${field}'s values (${errorList.join(
      ', '
    )}) is not one of the allowed values (${allowedValues.join(', ')})`,
  };
}

function findInvalidCategories(categories: string[]): string[] {
  const invalidCategories: string[] = [];
  for (const c of categories) {
    if (!EVENT_CATEGORIES.includes(c)) {
      invalidCategories.push(c);
    }
  }
  return invalidCategories;
}

function findInvalidTypes(types: string[]): string[] {
  const invalidTypes: string[] = [];
  for (const t of types) {
    if (!EVENT_TYPES.includes(t)) {
      invalidTypes.push(t);
    }
  }
  return invalidTypes;
}

function getTypeCategoryIncompatibleError(
  categories: string[],
  types: string[]
): CategorizationError[] {
  const errors: CategorizationError[] = [];
  let unmatchedTypes = new Set(types);
  const matchCategories = new Set(categories);
  let categoryExists = false;

  for (const c of matchCategories) {
    if (c in ECS_EVENT_TYPES_PER_CATEGORY) {
      categoryExists = true;
      const matchTypes = new Set(ECS_EVENT_TYPES_PER_CATEGORY[c as EventCategories]);
      unmatchedTypes = new Set([...unmatchedTypes].filter((x) => !matchTypes.has(x)));
    }
  }

  if (categoryExists && unmatchedTypes.size > 0) {
    errors.push({
      error: `event.type (${[...unmatchedTypes].join(
        ', '
      )}) not compatible with any of the event.category (${[...matchCategories].join(', ')})`,
    });
  }

  return errors;
}
