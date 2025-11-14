/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { isInheritLifecycle } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import { validateCondition } from '@kbn/streamlang';
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

const INVALID_CHARS_REGEX = /[\[\]]/; // Checks for either '[' or ']'

function checkFieldName(fieldName: string) {
  if (INVALID_CHARS_REGEX.test(fieldName)) {
    throw new MalformedStreamError(
      `Invalid field name: [${fieldName}] contains illegal characters.`
    );
  }
}

// NOTE: Processing checks happen as part of the Streamlang validation.
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
        const conditionErrors: string[] = [];
        validateCondition(rule.where, conditionErrors);
        if (conditionErrors.length > 0) {
          throw new MalformedStreamError(
            `Invalid routing rule: [${JSON.stringify(rule)}]. Errors: ${conditionErrors.join(', ')}`
          );
        }
      }
    }
  } else if (Streams.ClassicStream.Definition.is(definition)) {
    if (definition.ingest.classic.field_overrides) {
      for (const fieldName of Object.keys(definition.ingest.classic.field_overrides)) {
        checkFieldName(fieldName);
      }
    }
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
