/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, isInheritFailureStore } from '@kbn/streams-schema';
import { isInheritLifecycle } from '@kbn/streams-schema';
import { isEqual, noop } from 'lodash';
import type {
  AppendProcessor,
  Condition,
  ConvertProcessor,
  DateProcessor,
  DissectProcessor,
  GrokProcessor,
  JoinProcessor,
  LowercaseProcessor,
  MathProcessor,
  ProcessorType,
  RemoveByPrefixProcessor,
  RemoveProcessor,
  RenameProcessor,
  ReplaceProcessor,
  SetProcessor,
  StreamlangProcessorDefinition,
  TrimProcessor,
  UppercaseProcessor,
} from '@kbn/streamlang';
import {
  isActionBlock,
  isAndCondition,
  isFilterCondition,
  isNotCondition,
  isOrCondition,
  isConditionBlock,
  isConditionComplete,
  extractFieldsFromMathExpression,
} from '@kbn/streamlang';
import type { StreamlangStep } from '@kbn/streamlang/types/streamlang';
import { MalformedStreamError } from '../errors/malformed_stream_error';
import { RootStreamImmutabilityError } from '../errors/root_stream_immutability_error';

/*
 * Changes to mappings (fields) and processing rules are not allowed on the root stream.
 * Changes to routing rules are allowed.
 * Root stream cannot inherit a lifecycle.
 */
export function validateRootStreamChanges(
  currentStreamDefinition: Streams.WiredStream.Definition,
  nextStreamDefinition: Streams.WiredStream.Definition
) {
  const hasFieldChanges = !isEqual(
    currentStreamDefinition.ingest.wired.fields,
    nextStreamDefinition.ingest.wired.fields
  );

  if (hasFieldChanges) {
    throw new RootStreamImmutabilityError('Root stream fields cannot be changed');
  }

  const hasProcessingChanges = !isEqual(
    currentStreamDefinition.ingest.processing,
    nextStreamDefinition.ingest.processing
  );

  if (hasProcessingChanges) {
    throw new RootStreamImmutabilityError('Root stream processing rules cannot be changed');
  }

  if (isInheritLifecycle(nextStreamDefinition.ingest.lifecycle)) {
    throw new MalformedStreamError('Root stream cannot inherit lifecycle');
  }

  if (isInheritFailureStore(nextStreamDefinition.ingest.failure_store)) {
    throw new MalformedStreamError('Root stream cannot inherit failure store');
  }
}

export function validateNoManualIngestPipelineUsage(steps: StreamlangStep[]) {
  for (const step of steps) {
    if ('action' in step && step.action === 'manual_ingest_pipeline') {
      throw new MalformedStreamError('Manual ingest pipelines are not allowed');
    }
    if ('condition' in step && step.condition && 'steps' in step.condition) {
      validateNoManualIngestPipelineUsage(step.condition.steps);
    }
  }
}

const INVALID_CHARS_REGEX = /[\[\]]/; // Checks for either '[' or ']'

function checkFieldName(fieldName: string) {
  if (INVALID_CHARS_REGEX.test(fieldName)) {
    throw new MalformedStreamError(
      `Invalid field name: [${fieldName}] contains illegal characters.`
    );
  }
}

function validateCondition(condition: Condition) {
  // Check if the condition is complete (all required values filled)
  // This catches incomplete range conditions, empty fields, etc.
  if (!isConditionComplete(condition)) {
    throw new MalformedStreamError('Condition is incomplete: all required values must be filled');
  }

  if (isAndCondition(condition)) {
    condition.and.forEach(validateCondition);
  } else if (isOrCondition(condition)) {
    condition.or.forEach(validateCondition);
  } else if (isNotCondition(condition)) {
    validateCondition(condition.not);
  } else if (isFilterCondition(condition)) {
    checkFieldName(condition.field);
  }
}

const actionStepValidators: {
  [K in ProcessorType]: (step: Extract<StreamlangProcessorDefinition, { action: K }>) => void;
} = {
  append: (step: AppendProcessor) => checkFieldName(step.to),
  convert: (step: ConvertProcessor) => {
    checkFieldName(step.from);
    if ('to' in step && step.to) {
      checkFieldName(step.to);
    }
  },
  date: (step: DateProcessor) => {
    checkFieldName(step.from);
    if ('to' in step && step.to) {
      checkFieldName(step.to);
    }
  },
  dissect: (step: DissectProcessor) => checkFieldName(step.from),
  grok: (step: GrokProcessor) => checkFieldName(step.from),
  rename: (step: RenameProcessor) => {
    checkFieldName(step.from);
    checkFieldName(step.to);
  },
  set: (step: SetProcessor) => {
    checkFieldName(step.to);
    if (step.copy_from) {
      checkFieldName(step.copy_from);
    }
  },
  remove_by_prefix: (step: RemoveByPrefixProcessor) => checkFieldName(step.from),
  remove: (step: RemoveProcessor) => checkFieldName(step.from),
  drop_document: noop, // 'where' condition is already validated in validateSteps function
  replace: (step: ReplaceProcessor) => {
    checkFieldName(step.from);
    if ('to' in step && step.to) {
      checkFieldName(step.to);
    }
  },
  math: (step: MathProcessor) => {
    checkFieldName(step.to);
    // Also validate field references in the expression
    const expressionFields = extractFieldsFromMathExpression(step.expression);
    for (const field of expressionFields) {
      checkFieldName(field);
    }
  },
  uppercase: (step: UppercaseProcessor) => {
    checkFieldName(step.from);
    if ('to' in step && step.to) {
      checkFieldName(step.to);
    }
  },
  lowercase: (step: LowercaseProcessor) => {
    checkFieldName(step.from);
    if ('to' in step && step.to) {
      checkFieldName(step.to);
    }
  },
  trim: (step: TrimProcessor) => {
    checkFieldName(step.from);
    if ('to' in step && step.to) {
      checkFieldName(step.to);
    }
  },
  join: (step: JoinProcessor) => {
    checkFieldName(step.to);
    for (const field of step.from) {
      checkFieldName(field);
    }
  },
  // fields referenced in manual ingest pipelines are not validated here because
  // the interface is Elasticsearch directly here, which has its own validation
  manual_ingest_pipeline: () => {},
};

function validateSteps(steps: StreamlangStep[], isWithinWhereBlock = false) {
  for (const step of steps) {
    if (isConditionBlock(step)) {
      validateCondition(step.condition as Condition);
      // Nested steps are within a where block
      validateSteps(step.condition.steps, true);
    } else if (isActionBlock(step)) {
      // Check if remove_by_prefix is being used within a where block
      if (step.action === 'remove_by_prefix' && isWithinWhereBlock) {
        throw new MalformedStreamError(
          'remove_by_prefix processor cannot be used within a where block. Use it at the root level or use the remove processor with a condition instead.'
        );
      }

      if ('where' in step && step.where) {
        validateCondition(step.where);
      }
      const validateStep = actionStepValidators[step.action] as (
        s: StreamlangProcessorDefinition
      ) => void;
      validateStep(step);
    }
  }
}

export function validateBracketsInFieldNames(definition: Streams.ingest.all.Definition) {
  if (!definition.ingest) {
    return;
  }

  if (Streams.WiredStream.Definition.is(definition)) {
    if (definition.ingest.wired.fields) {
      for (const fieldName of Object.keys(definition.ingest.wired.fields)) {
        checkFieldName(fieldName);
      }
    }
    if (definition.ingest.wired.routing) {
      for (const rule of definition.ingest.wired.routing) {
        validateCondition(rule.where);
      }
    }
  } else if (Streams.ClassicStream.Definition.is(definition)) {
    if (definition.ingest.classic.field_overrides) {
      for (const fieldName of Object.keys(definition.ingest.classic.field_overrides)) {
        checkFieldName(fieldName);
      }
    }
  }

  if (definition.ingest.processing?.steps) {
    validateSteps(definition.ingest.processing.steps);
  }
}
