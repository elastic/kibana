/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { type Streams, isRoot, isDraftStream, LOGS_ROOT_STREAM_NAME } from '@kbn/streams-schema';
import { EuiCallOut } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import { useStreamsAppParams } from '../../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { RedirectTo } from '../../../redirect_to';
import { StreamDetailRouting } from '../stream_detail_routing';
import { StreamDetailSchemaEditor } from '../stream_detail_schema_editor';
import { StreamDetailLifecycle } from '../stream_detail_lifecycle';
import { StreamOverview } from '../../../stream_detail_overview';
import { Wrapper } from './wrapper';
import { MissingDataStreamCallout } from './missing_data_stream_callout';
import { PendingRootDataStreamCallout } from './pending_root_data_stream_callout';
import { useStreamsDetailManagementTabs } from './use_streams_detail_management_tabs';
import { StreamDetailDataQuality } from '../../../stream_data_quality';
import { StreamsAppHeader, StreamsAppPageTemplate } from '../../../streams_app_page_template';
import { WiredStreamBadge } from '../../../stream_badges';
import { StreamDetailAttachments } from '../../../stream_detail_attachments';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsPrivileges } from '../../../../hooks/use_streams_privileges';
import { buildLifecycleTabActions } from './lifecycle_tab_label_with_actions';
import { StreamDetailCanvas } from '../stream_detail_canvas';

const wiredStreamManagementSubTabs = [
  'overview',
  'partitioning',
  'processing',
  'schema',
  'lifecycle',
  'significantEvents',
  'dataQuality',
  'attachments',
  'canvas',
] as const;

type WiredStreamManagementSubTab = (typeof wiredStreamManagementSubTabs)[number];

const tabRedirects: Record<string, { newTab: WiredStreamManagementSubTab }> = {
  advanced: { newTab: 'overview' },
  schemaEditor: { newTab: 'schema' },
  retention: { newTab: 'lifecycle' },
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
    core: { notifications },
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}');
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();

  const { processing, isLoading, ...otherTabs } = useStreamsDetailManagementTabs({
    definition,
    refreshDefinition,
  });
  const {
    features: { canvas },
  } = useStreamsPrivileges();

  const backToStreamsLabel = i18n.translate('xpack.streams.streamDetailView.backToStreamsLabel', {
    defaultMessage: 'Streams',
  });
  const wiredBadges: AppHeaderBadge[] = [
    {
      label: i18n.translate('xpack.streams.entityDetailViewWithoutParams.managedBadgeLabel', {
        defaultMessage: 'Wired',
      }),
      renderCustomBadge: () => <WiredStreamBadge />,
    },
  ];

  if (!definition.privileges.view_index_metadata) {
    return (
      <>
        <StreamsAppHeader
          title={key}
          back={{ href: router.link('/'), label: backToStreamsLabel }}
          badges={wiredBadges}
          padding="m"
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

  const isNewRootStream =
    isRoot(definition.stream.name) && definition.stream.name !== LOGS_ROOT_STREAM_NAME;

  const isDraft = isDraftStream(definition.stream);

  if (!definition.data_stream_exists && !isNewRootStream && !isDraft) {
    return (
      <>
        <StreamsAppHeader
          title={key}
          back={{ href: router.link('/'), label: backToStreamsLabel }}
          badges={wiredBadges}
          padding="m"
        />
        <StreamsAppPageTemplate.Body>
          <MissingDataStreamCallout
            streamName={definition.stream.name}
            canManage={definition.privileges.manage}
            canDelete={
              !isRoot(definition.stream.name) || definition.stream.name === LOGS_ROOT_STREAM_NAME
            }
            refreshDefinition={refreshDefinition}
          />
        </StreamsAppPageTemplate.Body>
      </>
    );
  }

  if (!definition.data_stream_exists && isNewRootStream) {
    return (
      <>
        <StreamsAppHeader
          title={key}
          back={{ href: router.link('/'), label: backToStreamsLabel }}
          badges={wiredBadges}
          padding="m"
        />
        <StreamsAppPageTemplate.Body>
          <PendingRootDataStreamCallout
            streamName={definition.stream.name}
            canManage={definition.privileges.manage}
            refreshDefinition={refreshDefinition}
          />
        </StreamsAppPageTemplate.Body>
      </>
    );
  }

  const tabs = {
    overview: {
      content: <StreamOverview />,
      label: i18n.translate('xpack.streams.streamDetailView.overviewTab', {
        defaultMessage: 'Overview',
      }),
    },
    ...(!isDraft
      ? {
          lifecycle: {
            content: (
              <StreamDetailLifecycle
                definition={definition}
                refreshDefinition={refreshDefinition}
              />
            ),
            label: i18n.translate('xpack.streams.streamDetailView.lifecycleTab', {
              defaultMessage: 'Data lifecycle',
            }),
            toolTipContent: i18n.translate('xpack.streams.managementTab.lifecycle.tooltip', {
              defaultMessage:
                'Control how long data stays in this stream. Set a custom duration or apply a shared policy.',
            }),
            'data-test-subj': 'retentionTab',
            actions: buildLifecycleTabActions({
              definition,
              notifications,
              share,
              router,
              timeRange: { rangeFrom, rangeTo },
            }),
          },
        }
      : {}),
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
    ...(!isDraft
      ? {
          dataQuality: {
            content: (
              <StreamDetailDataQuality
                definition={definition}
                refreshDefinition={refreshDefinition}
              />
            ),
            label: i18n.translate('xpack.streams.streamDetailView.qualityTab', {
              defaultMessage: 'Data quality',
            }),
            toolTipContent: i18n.translate(
              'xpack.streams.managementTab.dataQuality.wired.tooltip',
              {
                defaultMessage: "View details about this stream's data quality",
              }
            ),
            'data-test-subj': 'dataQualityTab',
          },
        }
      : {}),
    attachments: {
      content: <StreamDetailAttachments definition={definition} />,
      label: i18n.translate('xpack.streams.streamDetailView.attachmentsTab', {
        defaultMessage: 'Attachments',
      }),
    },
    ...(canvas.enabled
      ? {
          canvas: {
            content: <StreamDetailCanvas definition={definition} />,
            label: i18n.translate('xpack.streams.streamDetailView.canvasTab', {
              defaultMessage: 'Canvas',
            }),
          },
        }
      : {}),
    ...otherTabs,
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

  // Render a valid subtab only when its content is actually present. Tabs are hidden depending on
  // context (e.g. canvas disabled, or significant events not rolled out via the
  // streams.significantEventsAvailable feature flag); in that case fall through to the redirects
  // below so we never render an empty body for a hidden tab.
  if (isValidManagementSubTab(tab) && tabs[tab]?.content) {
    return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
  }

  if (isDraft && (tab === 'lifecycle' || tab === 'dataQuality')) {
    return (
      <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'partitioning' } }} />
    );
  }

  if (isLoading) {
    return null;
  }

  return <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'overview' } }} />;
}
