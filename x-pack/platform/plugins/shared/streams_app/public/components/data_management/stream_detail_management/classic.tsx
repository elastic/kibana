/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { UnwiredStreamGetResponse } from '@kbn/streams-schema';
import { EuiCallOut, EuiFlexGroup } from '@elastic/eui';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { RedirectTo } from '../../redirect_to';
import { StreamDetailEnrichment } from '../stream_detail_enrichment';
import { ManagementTabs, Wrapper } from './wrapper';
import { StreamDetailLifecycle } from '../stream_detail_lifecycle';
import { UnmanagedElasticsearchAssets } from './unmanaged_elasticsearch_assets';

type ManagementSubTabs = 'enrich' | 'advanced' | 'lifecycle';

function isValidManagementSubTab(value: string): value is ManagementSubTabs {
  return ['enrich', 'advanced', 'lifecycle'].includes(value);
}

export function ClassicStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: UnwiredStreamGetResponse;
  refreshDefinition: () => void;
}) {
  const {
    path: { key, subtab },
  } = useStreamsAppParams('/{key}/{tab}/{subtab}');

  if (!definition.data_stream_exists) {
    return (
      <EuiFlexGroup direction="column">
        <EuiCallOut
          title={i18n.translate('xpack.streams.unmanagedStreamOverview.missingDatastream.title', {
            defaultMessage: 'Data stream missing',
          })}
          color="danger"
          iconType="error"
        >
          <p>
            {i18n.translate('xpack.streams.unmanagedStreamOverview.missingDatastream.description', {
              defaultMessage:
                'The underlying Elasticsearch data stream for this classic stream is missing. Recreate the data stream to restore the stream by sending data before using the management features.',
            })}{' '}
          </p>
        </EuiCallOut>
      </EuiFlexGroup>
    );
  }

  const tabs: ManagementTabs = {};

  if (definition.data_stream_exists) {
    tabs.enrich = {
      content: (
        <StreamDetailEnrichment definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.enrichmentTab', {
        defaultMessage: 'Extract field',
      }),
    };

    tabs.lifecycle = {
      content: (
        <StreamDetailLifecycle definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.lifecycleTab', {
        defaultMessage: 'Data retention',
      }),
    };
  }

  tabs.advanced = {
    content: (
      <UnmanagedElasticsearchAssets definition={definition} refreshDefinition={refreshDefinition} />
    ),
    label: i18n.translate('xpack.streams.streamDetailView.advancedTab', {
      defaultMessage: 'Advanced',
    }),
  };

  if (!isValidManagementSubTab(subtab)) {
    return (
      <RedirectTo
        path="/{key}/{tab}/{subtab}"
        params={{ path: { key, tab: 'management', subtab: 'enrich' } }}
      />
    );
  }

  return <Wrapper tabs={tabs} streamId={key} subtab={subtab} />;
}
