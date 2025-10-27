/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import type { Condition } from '../../types/conditions';
import {
  isAndCondition,
  isOrCondition,
  isNotCondition,
  isFilterCondition,
  isAlwaysCondition,
} from '../../types/conditions';
import type {
  StreamlangProcessorDefinition,
  ProcessorType,
  AppendProcessor,
  ConvertProcessor,
  DateProcessor,
  DissectProcessor,
  GrokProcessor,
  RenameProcessor,
  SetProcessor,
  RemoveProcessor,
  RemoveByPrefixProcessor,
} from '../../types/processors';
import type { StreamlangStep } from '../../types/streamlang';
import {
  isActionBlock,
  isStreamlangDSLSchema,
  isWhereBlock,
  type StreamlangDSL,
} from '../../types/streamlang';

export class StreamlangValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join('\n'));
    this.name = 'StreamlangValidationError';
  }
}

type StreamType = 'wired' | 'classic';

export const validateStreamlang = (dsl: StreamlangDSL, streamType?: StreamType): true => {
  // First, a schema check.
  const isValidSchema = isStreamlangDSLSchema(dsl);

  if (!isValidSchema) {
    throw new StreamlangValidationError([
      'Streamlang DSL does not conform to the Streamlang schema.',
    ]);
  }

  // Next, additional validations outside of the Zod schema.
  const errors: string[] = [];

  validateSteps(dsl.steps, errors);

  // Some actions have constraints around conditionals due to how ESQL CASE statements work.
  validateConvertActionConditions(dsl.steps, errors);
  validateRemoveByPrefixInWhereBlocks(dsl.steps, errors);

  // Manual ingest pipelines are an escape hatch for Classic streams only.
  if (streamType === 'wired') {
    validateNoManualIngestPipelineUsage(dsl.steps, errors);
  }

  if (errors.length > 0) {
    throw new StreamlangValidationError(errors);
  }

  return true;
};

function validateSteps(steps: StreamlangStep[], errors: string[]) {
  for (const step of steps) {
    if ('where' in step && step.where && 'steps' in step.where) {
      validateCondition(step.where as Condition, errors);
      // Steps inside a where block are nested
      validateSteps(step.where.steps, errors);
    } else if (isActionBlock(step)) {
      if ('where' in step && step.where) {
        validateCondition(step.where, errors);
      }
      const validateStep = actionStepValidators[step.action] as (
        s: StreamlangProcessorDefinition,
        errors: string[]
      ) => void;
      validateStep(step, errors);
    }
  }
}

export function validateCondition(condition: Condition, errors: string[]) {
  if (isAndCondition(condition)) {
    condition.and.forEach((c) => validateCondition(c, errors));
  } else if (isOrCondition(condition)) {
    condition.or.forEach((c) => validateCondition(c, errors));
  } else if (isNotCondition(condition)) {
    validateCondition(condition.not, errors);
  } else if (isFilterCondition(condition)) {
    checkFieldName(condition.field, errors);
  }
}

const actionStepValidators: {
  [K in ProcessorType]: (
    step: Extract<StreamlangProcessorDefinition, { action: K }>,
    errors: string[]
  ) => void;
} = {
  append: (step: AppendProcessor, errors: string[]) => checkFieldName(step.to, errors),
  convert: (step: ConvertProcessor, errors: string[]) => {
    checkFieldName(step.from, errors);
    if ('to' in step && step.to) {
      checkFieldName(step.to, errors);
    }
  },
  date: (step: DateProcessor, errors: string[]) => {
    checkFieldName(step.from, errors);
    if ('to' in step && step.to) {
      checkFieldName(step.to, errors);
    }
  },
  dissect: (step: DissectProcessor, errors: string[]) => checkFieldName(step.from, errors),
  grok: (step: GrokProcessor, errors: string[]) => checkFieldName(step.from, errors),
  rename: (step: RenameProcessor, errors: string[]) => {
    checkFieldName(step.from, errors);
    checkFieldName(step.to, errors);
  },
  set: (step: SetProcessor, errors: string[]) => {
    checkFieldName(step.to, errors);
    if (step.copy_from) {
      checkFieldName(step.copy_from, errors);
    }
  },
  remove_by_prefix: (step: RemoveByPrefixProcessor, errors: string[]) =>
    checkFieldName(step.from, errors),
  remove: (step: RemoveProcessor, errors: string[]) => checkFieldName(step.from, errors),
  drop_document: noop, // 'where' condition is already validated in validateSteps function
  // fields referenced in manual ingest pipelines are not validated here because
  // the interface is Elasticsearch directly here, which has its own validation
  manual_ingest_pipeline: () => {},
};

const INVALID_CHARS_REGEX = /[\[\]]/; // Checks for either '[' or ']'

function checkFieldName(fieldName: string, errors: string[]) {
  if (INVALID_CHARS_REGEX.test(fieldName)) {
    errors.push(`Invalid field name: [${fieldName}] contains illegal characters.`);
  }
}

function validateNoManualIngestPipelineUsage(steps: StreamlangStep[], errors: string[]) {
  for (const step of steps) {
    if ('action' in step && step.action === 'manual_ingest_pipeline') {
      errors.push('Manual ingest pipelines are not allowed');
    }
    if ('where' in step && step.where && 'steps' in step.where) {
      validateNoManualIngestPipelineUsage(step.where.steps, errors);
    }
  }
}

// ESQL is strict about types for fields.
// These checks ensure we don't attempt to change the type of an existing field conditionally.
// It's okay to use the new type with a new field.
const validateConvertActionConditions = (
  steps: StreamlangStep[],
  errors: string[],
  isWithinWhereBlock: boolean = false
) => {
  for (const step of steps) {
    // Handle where blocks with nested steps
    if (isWhereBlock(step)) {
      // Recursively validate nested steps (they are within a where block)
      validateConvertActionConditions(step.where.steps, errors, true);
      if (errors.length > 0) {
        return;
      }
    } else if (isActionBlock(step) && step.action === 'convert') {
      // Validate convert processor
      const hasTargetField = Boolean(step.to?.trim());
      const isEqualToSourceField = step.to?.trim() === step.from.trim();
      const hasCondition = 'where' in step && !isAlwaysCondition(step.where);

      // Validation for steps within a where block
      if (isWithinWhereBlock) {
        if (!hasTargetField) {
          errors.push(
            'For a convert processor within a where block, the target field is required. Either set this field or move the processor to the root level.'
          );
          return;
        }
        if (isEqualToSourceField) {
          errors.push(
            'The target field cannot be the same as the source field inside of a where block.'
          );
          return;
        }
      }

      // Validation for steps with a where condition
      if (hasCondition) {
        if (!hasTargetField) {
          errors.push(
            'For a convert processor with a defined condition, the target field is required. Either set this field or remove the processor condition.'
          );
          return;
        }
        if (isEqualToSourceField) {
          errors.push(
            'The target field cannot be the same as the source field when a condition is defined.'
          );
          return;
        }
      }
    }
  }
};

const validateRemoveByPrefixInWhereBlocks = (
  steps: StreamlangStep[],
  errors: string[],
  isWithinWhereBlock: boolean = false
) => {
  for (const step of steps) {
    // Handle where blocks with nested steps
    if (isWhereBlock(step)) {
      // Recursively validate nested steps (they are within a where block)
      validateRemoveByPrefixInWhereBlocks(step.where.steps, errors, true);
    } else {
      if (step.action === 'remove_by_prefix' && isWithinWhereBlock) {
        errors.push(
          'remove_by_prefix processor cannot be used within a where block. Use it at the root level or use the remove processor with a condition instead.'
        );
      }
    }
  }
};
