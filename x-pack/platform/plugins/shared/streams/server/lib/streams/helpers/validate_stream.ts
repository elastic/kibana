/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, isInheritLifecycle } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
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
