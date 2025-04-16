/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { EuiBadgeGroup, EuiCallOut, EuiFlexGroup } from '@elastic/eui';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { RedirectTo } from '../../redirect_to';
import { StreamDetailEnrichment } from '../stream_detail_enrichment';
import { ManagementTabs, Wrapper } from './wrapper';
import { StreamDetailLifecycle } from '../stream_detail_lifecycle';
import { UnmanagedElasticsearchAssets } from './unmanaged_elasticsearch_assets';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { ClassicStreamBadge, LifecycleBadge } from '../../stream_badges';

const classicStreamManagementSubTabs = ['enrich', 'advanced', 'lifecycle'] as const;

type ClassicStreamManagementSubTab = (typeof classicStreamManagementSubTabs)[number];

function isValidManagementSubTab(value: string): value is ClassicStreamManagementSubTab {
  return classicStreamManagementSubTabs.includes(value as ClassicStreamManagementSubTab);
}

export function ClassicStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: Streams.UnwiredStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}');

  if (!definition.data_stream_exists) {
    return (
      <>
        <StreamsAppPageTemplate.Header
          bottomBorder="extended"
          pageTitle={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {i18n.translate('xpack.streams.entityDetailViewWithoutParams.manageStreamTitle', {
                defaultMessage: 'Manage stream {streamId}',
                values: { streamId: key },
              })}
              <EuiBadgeGroup gutterSize="s">
                {Streams.UnwiredStream.Definition.is(definition.stream) && <ClassicStreamBadge />}
                <LifecycleBadge lifecycle={definition.effective_lifecycle} />
              </EuiBadgeGroup>
            </EuiFlexGroup>
          }
        />
        <StreamsAppPageTemplate.Body>
          <EuiCallOut
            title={i18n.translate('xpack.streams.unmanagedStreamOverview.missingDatastream.title', {
              defaultMessage: 'Data stream missing',
            })}
            color="danger"
            iconType="error"
          >
            <p>
              {i18n.translate(
                'xpack.streams.unmanagedStreamOverview.missingDatastream.description',
                {
                  defaultMessage:
                    'The underlying Elasticsearch data stream for this classic stream is missing. Recreate the data stream to restore the stream by sending data before using the management features.',
                }
              )}
            </p>
          </EuiCallOut>
        </StreamsAppPageTemplate.Body>
      </>
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

  if (definition.privileges.manage) {
    tabs.advanced = {
      content: (
        <UnmanagedElasticsearchAssets
          definition={definition}
          refreshDefinition={refreshDefinition}
        />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.advancedTab', {
        defaultMessage: 'Advanced',
      }),
    };
  }

  if (!isValidManagementSubTab(tab)) {
    return <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'enrich' } }} />;
  }

  return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
}
