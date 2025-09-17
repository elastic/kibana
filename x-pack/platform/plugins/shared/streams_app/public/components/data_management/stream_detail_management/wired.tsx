/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { EuiToolTip } from '@elastic/eui';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { RedirectTo } from '../../redirect_to';
import { StreamDetailRouting } from '../stream_detail_routing';
import { StreamDetailSchemaEditor } from '../stream_detail_schema_editor';
import { StreamDetailLifecycle } from '../stream_detail_lifecycle';
import { Wrapper } from './wrapper';
import { useStreamsDetailManagementTabs } from './use_streams_detail_management_tabs';
import { WiredAdvancedView } from './wired_advanced_view';
import { StreamDetailDataQuality } from '../../stream_data_quality';

const wiredStreamManagementSubTabs = [
  'partitioning',
  'processing',
  'schema',
  'retention',
  'advanced',
  'significantEvents',
  'dataQuality',
  'references',
] as const;

type WiredStreamManagementSubTab = (typeof wiredStreamManagementSubTabs)[number];

const tabRedirects: Record<string, { newTab: WiredStreamManagementSubTab }> = {
  schemaEditor: { newTab: 'schema' },
  lifecycle: { newTab: 'retention' },
  route: { newTab: 'partitioning' },
  enrich: { newTab: 'processing' },
};
function isValidManagementSubTab(value: string): value is WiredStreamManagementSubTab {
  return wiredStreamManagementSubTabs.includes(value as WiredStreamManagementSubTab);
}

export function WiredStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}');

  const { processing, ...otherTabs } = useStreamsDetailManagementTabs({
    definition,
    refreshDefinition,
  });

  const tabs = {
    retention: {
      content: (
        <StreamDetailLifecycle definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: (
        <EuiToolTip
          position="top"
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
    },
    partitioning: {
      content: (
        <StreamDetailRouting definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.routingTab', {
        defaultMessage: 'Partitioning',
      }),
    },
    processing,
    schema: {
      content: (
        <StreamDetailSchemaEditor definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.schemaEditorTab', {
        defaultMessage: 'Schema',
      }),
    },
    dataQuality: {
      content: <StreamDetailDataQuality definition={definition} />,
      label: (
        <EuiToolTip
          content={i18n.translate('xpack.streams.managementTab.dataQuality.wired.tooltip', {
            defaultMessage: 'View details about this stream’s data quality',
          })}
        >
          <span>
            {i18n.translate('xpack.streams.streamDetailView.qualityTab', {
              defaultMessage: 'Data quality',
            })}
          </span>
        </EuiToolTip>
      ),
    },
    ...otherTabs,
    ...(definition.privileges.manage
      ? {
          advanced: {
            content: (
              <WiredAdvancedView definition={definition} refreshDefinition={refreshDefinition} />
            ),
            label: i18n.translate('xpack.streams.streamDetailView.advancedTab', {
              defaultMessage: 'Advanced',
            }),
          },
        }
      : {}),
  };

  const redirectConfig = tabRedirects[tab];
  if (redirectConfig) {
    return (
      <RedirectTo
        path="/{key}/management/{tab}"
        params={{ path: { key, tab: redirectConfig.newTab } }}
      />
    );
  }

  if (!isValidManagementSubTab(tab) || tabs[tab] === undefined) {
    return (
      <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'partitioning' } }} />
    );
  }

  return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
}
