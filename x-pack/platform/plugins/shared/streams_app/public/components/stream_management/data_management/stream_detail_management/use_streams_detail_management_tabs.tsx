/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import React from 'react';
import { StreamDetailEnrichment } from '../stream_detail_enrichment';

export function useStreamsDetailManagementTabs({
  definition,
  refreshDefinition,
}: {
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
}) {
  const isReplicated =
    Streams.ingest.all.GetResponse.is(definition) && definition.replicated === true;
  const isProcessingEnabled = Streams.ingest.all.GetResponse.is(definition) && !isReplicated;

  return {
    ...(isProcessingEnabled && {
      processing: {
        content: (
          <StreamDetailEnrichment definition={definition} refreshDefinition={refreshDefinition} />
        ),
        label: i18n.translate('xpack.streams.streamDetailView.processingTab', {
          defaultMessage: 'Processing',
        }),
      },
    }),
  };
}
