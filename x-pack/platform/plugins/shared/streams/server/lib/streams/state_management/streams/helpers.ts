/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isChildOf, Streams, type IngestStreamSettings } from '@kbn/streams-schema';
import type { BaseStream } from '@kbn/streams-schema/src/models/base';
import type { State } from '../state';
import type { ValidationResult } from '../stream_active_record/stream_active_record';

export function formatSettings(settings: IngestStreamSettings, isServerless: boolean) {
  if (isServerless) {
    return {
      'index.refresh_interval': settings['index.refresh_interval']?.value ?? null,
    };
  }

  return {
    'index.number_of_replicas': settings['index.number_of_replicas']?.value ?? null,
    'index.number_of_shards': settings['index.number_of_shards']?.value ?? null,
    'index.refresh_interval': settings['index.refresh_interval']?.value ?? null,
  };
}

export function settingsUpdateRequiresRollover(
  oldSettings: IngestStreamSettings,
  newSettings: IngestStreamSettings
) {
  return (
    oldSettings['index.number_of_shards']?.value !== newSettings['index.number_of_shards']?.value
  );
}

/**
 * Validates that the query streams are valid for the parent stream
 * @param name - The name of the parent stream
 * @param queryStreams - The query streams to validate
 * @param desiredState - The desired state of the streams
 * @returns A validation result if the query streams are invalid, otherwise undefined
 */
export const validateQueryStreams = ({
  desiredState,
  name,
  queryStreams,
}: {
  desiredState: State;
  name: string;
  queryStreams?: BaseStream.QueryStreamReference[];
}): ValidationResult | undefined => {
  const queryStreamChildren = new Set<string>();

  for (const childRef of queryStreams ?? []) {
    const childName = childRef.name;

    // Validate naming convention - child must follow parent.childname pattern
    if (!isChildOf(name, childName)) {
      return {
        isValid: false,
        errors: [
          new Error(
            `Child query stream "${childName}" must follow naming convention: "${name}.<childname>"`
          ),
        ],
      };
    }

    // Check for duplicates
    if (queryStreamChildren.has(childName)) {
      return {
        isValid: false,
        errors: [
          new Error(`Duplicate child query stream "${childName}" in query_streams of "${name}"`),
        ],
      };
    }
    queryStreamChildren.add(childName);

    // Validate that child exists in desired state as a query stream
    const childStream = desiredState.get(childName);
    if (!childStream) {
      return {
        isValid: false,
        errors: [
          new Error(`Child query stream "${childName}" referenced in query_streams does not exist`),
        ],
      };
    }
    if (!childStream.isDeleted() && !Streams.QueryStream.Definition.is(childStream.definition)) {
      return {
        isValid: false,
        errors: [
          new Error(
            `Child "${childName}" in query_streams must be a query stream, but is a different type`
          ),
        ],
      };
    }
  }

  // Validate that all child query streams (by naming convention) are in query_streams array
  for (const stream of desiredState.all()) {
    if (
      !stream.isDeleted() &&
      isChildOf(name, stream.definition.name) &&
      Streams.QueryStream.Definition.is(stream.definition) &&
      !queryStreamChildren.has(stream.definition.name)
    ) {
      return {
        isValid: false,
        errors: [
          new Error(
            `Child query stream "${stream.definition.name}" is not listed in query_streams of its parent "${name}"`
          ),
        ],
      };
    }
  }

  return undefined;
};
