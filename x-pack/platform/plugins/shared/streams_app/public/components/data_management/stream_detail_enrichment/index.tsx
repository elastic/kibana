/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { Streams } from '@kbn/streams-schema';
import { isRootStreamDefinition } from '@kbn/streams-schema';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { getStreamTypeFromDefinition } from '../../../util/get_stream_type_from_definition';
import { RootStreamEmptyPrompt } from './empty_prompts';

const StreamDetailEnrichmentContent = dynamic(() =>
  import(/* webpackChunkName: "management_enrichment" */ './page_content').then((mod) => ({
    default: mod.StreamDetailEnrichmentContent,
  }))
);

interface StreamDetailEnrichmentProps {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}

export function StreamDetailEnrichment({
  definition,
  refreshDefinition,
}: StreamDetailEnrichmentProps) {
  const { onPageReady } = usePerformanceContext();

  const isRootStream = isRootStreamDefinition(definition.stream);

  // Telemetry for TTFMP (time to first meaningful paint)
  useEffect(() => {
    const streamType = getStreamTypeFromDefinition(definition.stream);
    onPageReady({
      meta: {
        description: `[ttfmp_streams] streamType: ${streamType}`,
      },
      customMetrics: {
        key1: 'isRootStream',
        value1: isRootStream ? 1 : 0,
      },
    });
  }, [isRootStream, onPageReady, definition.stream]);

  if (isRootStream) {
    return <RootStreamEmptyPrompt />;
  }

  return (
    <StreamDetailEnrichmentContent definition={definition} refreshDefinition={refreshDefinition} />
  );
}
