/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DropDocumentProcessor } from '../../../../types/processors';
import type { Condition } from '../../../../types/conditions';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';

/**
 * Emits a filter-processor condition. A log record matching the condition is
 * dropped. Zod enforces `where` is present on drop_document, so no fallback
 * needed.
 */
export const convertDropDocumentProcessorToOtel = (processor: DropDocumentProcessor): Emission => {
  const { where } = processor;
  return {
    kind: 'filter',
    conditions: [conditionToOttl(where as Condition)],
  };
};
