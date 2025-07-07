/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { StreamDetailEnrichment } from '../stream_detail_enrichment';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { StreamDetailSignificantEventsView } from '../../stream_detail_significant_events_view';

export function useStreamsDetailManagementTabs({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    features: { significantEvents },
  } = useStreamsPrivileges();

  const isSignificantEventsEnabled = !!significantEvents?.available;

  return {
    enrich: {
      content: (
        <StreamDetailEnrichment definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.processingTab', {
        defaultMessage: 'Processing',
      }),
    },
    ...(isSignificantEventsEnabled
      ? {
          significantEvents: {
            content: (
              <StreamDetailSignificantEventsView
                definition={definition}
                refreshDefinition={refreshDefinition}
              />
            ),
            label: i18n.translate('xpack.streams.streamDetailView.significantEventsTab', {
              defaultMessage: 'Significant events',
            }),
          },
        }
      : {}),
  };
}
