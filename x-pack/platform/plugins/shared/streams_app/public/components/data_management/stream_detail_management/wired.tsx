/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { EuiBadgeGroup, EuiCallOut, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { RedirectTo } from '../../redirect_to';
import { StreamDetailRouting } from '../stream_detail_routing';
import { StreamDetailSchemaEditor } from '../stream_detail_schema_editor';
import { StreamDetailLifecycle } from '../stream_detail_lifecycle';
import { Wrapper } from './wrapper';
import { useStreamsDetailManagementTabs } from './use_streams_detail_management_tabs';
import { WiredAdvancedView } from './advanced_view/wired_advanced_view';
import { StreamDetailDataQuality } from '../../stream_data_quality';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { WiredStreamBadge } from '../../stream_badges';
import { StreamDetailAttachments } from '../../stream_detail_attachments';

const wiredStreamManagementSubTabs = [
  'partitioning',
  'processing',
  'schema',
  'retention',
  'advanced',
  'significantEvents',
  'dataQuality',
  'attachments',
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

  const {
    features: { attachments },
  } = useStreamsPrivileges();

  const { processing, isLoading, ...otherTabs } = useStreamsDetailManagementTabs({
    definition,
    refreshDefinition,
  });

  if (!definition.privileges.view_index_metadata) {
    return (
      <>
        <StreamsAppPageTemplate.Header
          bottomBorder="extended"
          pageTitle={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {key}
              <EuiBadgeGroup gutterSize="s">
                <WiredStreamBadge />
              </EuiBadgeGroup>
            </EuiFlexGroup>
          }
        />
        <StreamsAppPageTemplate.Body>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.streams.wiredStreamOverview.noPrivileges.title', {
              defaultMessage: "Data stream couldn't be loaded",
            })}
            color="danger"
            iconType="error"
          >
            <p>
              {i18n.translate('xpack.streams.wiredStreamOverview.noPrivileges.description', {
                defaultMessage:
                  "You don't have the required privileges to view this stream. Make sure you have sufficient view_index_metadata privileges.",
              })}
            </p>
          </EuiCallOut>
        </StreamsAppPageTemplate.Body>
      </>
    );
  }

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
          <span data-test-subj="retentionTab" tabIndex={0}>
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
    ...(processing ? { processing } : {}),
    schema: {
      content: (
        <StreamDetailSchemaEditor definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.schemaEditorTab', {
        defaultMessage: 'Schema',
      }),
    },
    dataQuality: {
      content: (
        <StreamDetailDataQuality definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: (
        <EuiToolTip
          content={i18n.translate('xpack.streams.managementTab.dataQuality.wired.tooltip', {
            defaultMessage: 'View details about this stream’s data quality',
          })}
        >
          <span data-test-subj="dataQualityTab" tabIndex={0}>
            {i18n.translate('xpack.streams.streamDetailView.qualityTab', {
              defaultMessage: 'Data quality',
            })}
          </span>
        </EuiToolTip>
      ),
    },
    ...(attachments.enabled
      ? {
          attachments: {
            content: <StreamDetailAttachments definition={definition} />,
            label: i18n.translate('xpack.streams.streamDetailView.attachmentsTab', {
              defaultMessage: 'Attachments',
            }),
          },
        }
      : {}),
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

  if (isValidManagementSubTab(tab)) {
    return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
  }

  if (isLoading) {
    return null;
  }

  return (
    <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'partitioning' } }} />
  );
}
