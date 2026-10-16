/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { isRootStreamDefinition } from '@kbn/streams-schema';

import { RootStreamEmptyPrompt } from './empty_prompts';

interface StreamDetailEnrichmentProps {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}

export function StreamDetailEnrichment({
  definition,
  refreshDefinition,
}: StreamDetailEnrichmentProps) {
  const isRootStream = isRootStreamDefinition(definition.stream);

  if (isRootStream) {
    return <RootStreamEmptyPrompt />;
  }

  // Intentionally parked in the native ingest-pipeline UI. The active entry
  // point is the stream flyout Processing tab.
  return null;
}
