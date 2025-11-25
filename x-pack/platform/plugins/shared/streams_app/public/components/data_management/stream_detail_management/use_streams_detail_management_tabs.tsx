/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { StreamDetailSignificantEventsView } from '../../stream_detail_significant_events_view';
import { StreamDetailEnrichment } from '../stream_detail_enrichment';
import { StreamDetailReferencesView } from '../../stream_detail_references_view/stream_detail_references_view';

export function useStreamsDetailManagementTabs({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    features: { significantEvents, groupStreams },
    isLoading,
  } = useStreamsPrivileges();

  const isSignificantEventsEnabled = !!significantEvents?.available;

  return {
    isLoading,
    processing: {
      content: (
        <StreamDetailEnrichment definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.processingTab', {
        defaultMessage: 'Processing',
      }),
    },
    ...(groupStreams?.enabled
      ? {
          references: {
            content: <StreamDetailReferencesView definition={definition} />,
            label: i18n.translate('xpack.streams.streamDetailView.referencesTab', {
              defaultMessage: 'References',
            }),
          },
        }
      : {}),
    ...(isSignificantEventsEnabled
      ? {
          significantEvents: {
            content: <StreamDetailSignificantEventsView definition={definition} />,
            label: i18n.translate('xpack.streams.streamDetailView.significantEventsTab', {
              defaultMessage: 'Significant events',
            }),
          },
        }
      : {}),
  };
}
