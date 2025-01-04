/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Condition, ProcessingDefinition } from '../models';
import {
  isGrokProcessor,
  isDissectProcessor,
  isFilterCondition,
  isAndCondition,
  isOrCondition,
} from './type_guards';

export function getProcessorType(processor: ProcessingDefinition) {
  if (isGrokProcessor(processor.config)) {
    return 'grok';
  }
  if (isDissectProcessor(processor.config)) {
    return 'dissect';
  }
  throw new Error('Unknown processor type');
}

export function isCompleteCondition(condition: Condition): boolean {
  if (isFilterCondition(condition)) {
    return condition.field !== undefined && condition.field !== '';
  }
  if (isAndCondition(condition)) {
    return condition.and.every(isCompleteCondition);
  }
  if (isOrCondition(condition)) {
    return condition.or.every(isCompleteCondition);
  }
  return false;
}
