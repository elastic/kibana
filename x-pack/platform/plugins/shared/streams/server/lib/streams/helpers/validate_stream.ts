/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, isInheritFailureStore } from '@kbn/streams-schema';
import { isInheritLifecycle } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import type { Condition } from '@kbn/streamlang';
import {
  isAndCondition,
  isFilterCondition,
  isNotCondition,
  isOrCondition,
  isConditionComplete,
} from '@kbn/streamlang';
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

/**
 * Validates field definitions and routing rules for bracket characters in field names.
 * Processing step validation is handled by validateStreamlang.
 */
export function validateBracketsInFieldNames(definition: Streams.ingest.all.Definition) {
  if (!definition.ingest) {
    return;
  }

  if (Streams.WiredStream.Definition.is(definition)) {
    // Validate field definitions
    if (definition.ingest.wired.fields) {
      for (const fieldName of Object.keys(definition.ingest.wired.fields)) {
        checkFieldName(fieldName);
      }
    }
    // Validate routing rules
    if (definition.ingest.wired.routing) {
      for (const rule of definition.ingest.wired.routing) {
        validateCondition(rule.where);
      }
    }
  } else if (Streams.ClassicStream.Definition.is(definition)) {
    // Validate field overrides
    if (definition.ingest.classic.field_overrides) {
      for (const fieldName of Object.keys(definition.ingest.classic.field_overrides)) {
        checkFieldName(fieldName);
      }
    }
  }
}
