/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { isInheritLifecycle } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import type {
  AppendProcessor,
  Condition,
  DateProcessor,
  DissectProcessor,
  GrokProcessor,
  ProcessorType,
  RenameProcessor,
  SetProcessor,
  StreamlangProcessorDefinition,
} from '@kbn/streamlang';
import {
  isActionBlock,
  isAndCondition,
  isFilterCondition,
  isNotCondition,
  isOrCondition,
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
}

export function validateNoManualIngestPipelineUsage(steps: StreamlangStep[]) {
  for (const step of steps) {
    if ('action' in step && step.action === 'manual_ingest_pipeline') {
      throw new MalformedStreamError('Manual ingest pipelines are not allowed');
    }
    if ('where' in step && step.where && 'steps' in step.where) {
      validateNoManualIngestPipelineUsage(step.where.steps);
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
  // fields referenced in manual ingest pipelines are not validated here because
  // the interface is Elasticsearch directly here, which has its own validation
  manual_ingest_pipeline: () => {},
};

function validateSteps(steps: StreamlangStep[]) {
  for (const step of steps) {
    if ('where' in step && step.where && 'steps' in step.where) {
      validateCondition(step.where as Condition);
      validateSteps(step.where.steps);
    } else if (isActionBlock(step)) {
      if (step.where) {
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

export function validateSettings(definition: Streams.ingest.all.Definition, isServerless: boolean) {
  if (!isServerless) {
    return;
  }

  const serverlessAllowList = ['index.refresh_interval'];
  Object.keys(definition.ingest.settings).forEach((setting) => {
    if (!serverlessAllowList.includes(setting)) {
      throw new Error(`Setting [${setting}] is not allowed in serverless`);
    }
  });
}
