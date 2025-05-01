/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, isIlmLifecycle, isInheritLifecycle } from '@kbn/streams-schema';
import { difference, isEqual } from 'lodash';
import { MalformedChildrenError } from '../errors/malformed_children_error';
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

/**
 * Validates if the existing type is the same as the next type
 */
export function validateStreamTypeChanges(
  currentStreamDefinition: Streams.all.Definition,
  nextStreamDefinition: Streams.all.Definition
) {
  const fromUnwiredToWired =
    Streams.UnwiredStream.Definition.is(currentStreamDefinition) &&
    Streams.WiredStream.Definition.is(nextStreamDefinition);

  if (fromUnwiredToWired) {
    throw new MalformedStreamError('Cannot change unwired stream to wired stream');
  }

  const fromWiredToUnwired =
    Streams.WiredStream.Definition.is(currentStreamDefinition) &&
    Streams.UnwiredStream.Definition.is(nextStreamDefinition);

  if (fromWiredToUnwired) {
    throw new MalformedStreamError('Cannot change wired stream to unwired stream');
  }

  const fromIngestToGroup =
    Streams.GroupStream.Definition.is(nextStreamDefinition) &&
    Streams.ingest.all.Definition.is(currentStreamDefinition);

  if (fromIngestToGroup) {
    throw new MalformedStreamError('Cannot change ingest stream to group stream');
  }
}

/**
 * Validates whether no children are removed (which is not allowed via updates)
 */
export function validateStreamChildrenChanges(
  currentStreamDefinition: Streams.WiredStream.Definition,
  nextStreamDefinition: Streams.WiredStream.Definition
) {
  const existingChildren = currentStreamDefinition.ingest.wired.routing.map(
    (routingDefinition) => routingDefinition.destination
  );

  const nextChildren = nextStreamDefinition.ingest.wired.routing.map(
    (routingDefinition) => routingDefinition.destination
  );

  const removedChildren = difference(existingChildren, nextChildren);

  if (removedChildren.length) {
    throw new MalformedChildrenError('Cannot remove children from a stream via updates');
  }
}

export function validateStreamLifecycle(definition: Streams.all.Definition, isServerless: boolean) {
  if (!Streams.ingest.all.Definition.is(definition)) {
    return;
  }
  const lifecycle = definition.ingest.lifecycle;

  if (isServerless && isIlmLifecycle(lifecycle)) {
    throw new MalformedStreamError('ILM lifecycle is not supported in serverless environments');
  }

  if (Streams.UnwiredStream.Definition.is(definition) && isIlmLifecycle(lifecycle)) {
    throw new MalformedStreamError('ILM lifecycle is not supported for unwired streams');
  }
}
