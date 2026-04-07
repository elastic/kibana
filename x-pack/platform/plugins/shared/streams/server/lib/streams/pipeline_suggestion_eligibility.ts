/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';

/**
 * Pipeline suggestions are only offered for ingest streams that have no processing
 * steps yet. Used when reconciling background tasks and when counting suggestions
 * for the streams list.
 */
export function isStreamEligibleForPipelineSuggestion(stream: Streams.all.Definition): boolean {
  if (!Streams.ingest.all.Definition.is(stream)) {
    return false;
  }
  return stream.ingest.processing.steps.length === 0;
}
