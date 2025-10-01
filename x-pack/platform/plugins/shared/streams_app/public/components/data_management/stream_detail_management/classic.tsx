/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { EuiBadgeGroup, EuiCallOut, EuiFlexGroup, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { RedirectTo } from '../../redirect_to';
import type { ManagementTabs } from './wrapper';
import { Wrapper } from './wrapper';
import { StreamDetailLifecycle } from '../stream_detail_lifecycle';
import { UnmanagedElasticsearchAssets } from './unmanaged_elasticsearch_assets';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { ClassicStreamBadge, LifecycleBadge, WiredStreamBadge } from '../../stream_badges';
import { useStreamsDetailManagementTabs } from './use_streams_detail_management_tabs';
import { StreamDetailDataQuality } from '../../stream_data_quality';
import { StreamDetailSchemaEditor } from '../stream_detail_schema_editor';
import { StreamDescription } from './stream_description';

const classicStreamManagementSubTabs = [
  'processing',
  'advanced',
  'dataQuality',
  'retention',
  'significantEvents',
  'schemaEditor',
  'schema',
  'references',
] as const;

type ClassicStreamManagementSubTab = (typeof classicStreamManagementSubTabs)[number];

const tabRedirects: Record<string, { newTab: ClassicStreamManagementSubTab }> = {
  schemaEditor: { newTab: 'schema' },
  lifecycle: { newTab: 'retention' },
  enrich: { newTab: 'processing' },
};

function isValidManagementSubTab(value: string): value is ClassicStreamManagementSubTab {
  return classicStreamManagementSubTabs.includes(value as ClassicStreamManagementSubTab);
}

export function ClassicStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ClassicStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}');

  const { processing, isLoading, ...otherTabs } = useStreamsDetailManagementTabs({
    definition,
    refreshDefinition,
  });

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
                {Streams.ClassicStream.Definition.is(definition.stream) && <ClassicStreamBadge />}
                {Streams.WiredStream.Definition.is(definition.stream) && <WiredStreamBadge />}
                <LifecycleBadge lifecycle={definition.effective_lifecycle} />
              </EuiBadgeGroup>
            </EuiFlexGroup>
          }
        />
        <StreamsAppPageTemplate.Body>
          <EuiCallOut
            announceOnMount
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
    tabs.retention = {
      content: (
        <StreamDetailLifecycle definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: (
        <EuiToolTip
          content={i18n.translate('xpack.streams.managementTab.lifecycle.tooltip', {
            defaultMessage:
              'Control how long data stays in this stream. Set a custom duration or apply a shared policy.',
          })}
        >
          <span>
            {i18n.translate('xpack.streams.streamDetailView.lifecycleTab', {
              defaultMessage: 'Retention',
            })}
          </span>
        </EuiToolTip>
      ),
    };
    tabs.processing = processing;
  }

  tabs.dataQuality = {
    content: <StreamDetailDataQuality definition={definition} />,
    label: (
      <EuiToolTip
        content={i18n.translate('xpack.streams.managementTab.dataQuality.tooltip', {
          defaultMessage: 'View details about this classic stream’s data quality',
        })}
      >
        <span>
          {i18n.translate('xpack.streams.streamDetailView.qualityTab', {
            defaultMessage: 'Data quality',
          })}
        </span>
      </EuiToolTip>
    ),
  };

  if (definition.privileges.manage) {
    tabs.advanced = {
      content: (
        <>
          {otherTabs.significantEvents ? (
            <>
              <StreamDescription definition={definition} />
              <EuiSpacer />
            </>
          ) : null}
          <UnmanagedElasticsearchAssets
            definition={definition}
            refreshDefinition={refreshDefinition}
          />
        </>
      ),
      label: (
        <EuiToolTip
          content={i18n.translate('xpack.streams.managementTab.advanced.tooltip', {
            defaultMessage:
              'View technical details about this classic stream’s underlying index setup',
          })}
        >
          <span>
            {i18n.translate('xpack.streams.streamDetailView.advancedTab', {
              defaultMessage: 'Advanced',
            })}
          </span>
        </EuiToolTip>
      ),
    };
    tabs.schema = {
      content: (
        <StreamDetailSchemaEditor definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.schemaEditorTab', {
        defaultMessage: 'Schema',
      }),
    };
  }

  if (otherTabs.significantEvents) {
    tabs.significantEvents = otherTabs.significantEvents;
  }
  if (isValidManagementSubTab(tab)) {
    return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
  }

  const redirectConfig = tabRedirects[tab];
  if (redirectConfig) {
    return (
      <RedirectTo
        path="/{key}/management/{tab}"
        params={{ path: { key, tab: redirectConfig.newTab } }}
      />
    );
  }
  if (isLoading) {
    return null;
  }

  return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
}
