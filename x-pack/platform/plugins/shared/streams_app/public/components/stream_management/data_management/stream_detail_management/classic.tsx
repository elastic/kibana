/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import type { AppHeaderBadge } from '@kbn/app-header';
import { useStreamsAppParams } from '../../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useStreamsPrivileges } from '../../../../hooks/use_streams_privileges';
import { useKibana } from '../../../../hooks/use_kibana';
import { RedirectTo } from '../../../redirect_to';
import type { ManagementTabs } from './wrapper';
import { Wrapper } from './wrapper';
import { MissingDataStreamCallout } from './missing_data_stream_callout';
import { StreamDetailLifecycle } from '../stream_detail_lifecycle';
import { StreamDetailEnrichment } from '../stream_detail_enrichment';
import { StreamsAppHeader, StreamsAppPageTemplate } from '../../../streams_app_page_template';
import { ClassicStreamBadge, LifecycleBadge } from '../../../stream_badges';
import { StreamOverview } from '../../../stream_detail_overview';
import { StreamDetailDataQuality } from '../../../stream_data_quality';
import { StreamDetailSchemaEditor } from '../stream_detail_schema_editor';
import { StreamDetailAttachments } from '../../../stream_detail_attachments';
import { ClassicStreamPartitioning } from '../stream_detail_routing/classic_stream_partitioning';
import { buildLifecycleTabActions } from './lifecycle_tab_label_with_actions';
import {
  ImportLifecycleFlyoutProvider,
  useImportLifecycleFlyoutContext,
} from '../stream_detail_lifecycle/import_from_stream';
import { useSignificantEventsApp } from '../../../../hooks/use_significant_events_app';
import { SignificantEventsAppRedirect } from '../../../significant_events_app_redirect';

const classicStreamManagementSubTabs = [
  'overview',
  'lifecycle',
  'partitioning',
  'processing',
  'dataQuality',
  'schemaEditor',
  'schema',
  'attachments',
] as const;

type ClassicStreamManagementSubTab = (typeof classicStreamManagementSubTabs)[number];

const tabRedirects: Record<string, { newTab: ClassicStreamManagementSubTab }> = {
  advanced: { newTab: 'overview' },
  schemaEditor: { newTab: 'schema' },
  retention: { newTab: 'lifecycle' },
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
  return (
    <ImportLifecycleFlyoutProvider>
      <ClassicStreamDetailManagementContent
        definition={definition}
        refreshDefinition={refreshDefinition}
      />
    </ImportLifecycleFlyoutProvider>
  );
}

function ClassicStreamDetailManagementContent({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ClassicStream.GetResponse;
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
  const importLifecycleFlyout = useImportLifecycleFlyoutContext();

  const {
    features: { queryStreams, significantEvents },
    isLoading: isPrivilegesLoading,
  } = useStreamsPrivileges();
  const { isAvailable: isSignificantEventsAvailable, isLoading: isSignificantEventsLoading } =
    useSignificantEventsApp();

  const isProcessingEnabled = !definition.replicated;

  const backToStreamsLabel = i18n.translate('xpack.streams.streamDetailView.backToStreamsLabel', {
    defaultMessage: 'Streams',
  });

  if (!definition.data_stream_exists) {
    const classicErrorBadges: AppHeaderBadge[] = [
      {
        label: i18n.translate('xpack.streams.entityDetailViewWithoutParams.unmanagedBadgeLabel', {
          defaultMessage: 'Classic',
        }),
        renderCustomBadge: () => <ClassicStreamBadge />,
      },
      {
        label: i18n.translate('xpack.streams.badges.lifecycle.title', {
          defaultMessage: 'Data Retention',
        }),
        renderCustomBadge: () => <LifecycleBadge lifecycle={definition.effective_lifecycle} />,
      },
    ];
    return (
      <>
        <StreamsAppHeader
          title={key}
          back={{ href: router.link('/'), label: backToStreamsLabel }}
          badges={classicErrorBadges}
        />
        <StreamsAppPageTemplate.Body>
          <MissingDataStreamCallout
            streamName={definition.stream.name}
            canManage={definition.privileges.manage}
            canDelete={true}
            refreshDefinition={refreshDefinition}
          />
        </StreamsAppPageTemplate.Body>
      </>
    );
  }

  const tabs: ManagementTabs = {};

  tabs.overview = {
    content: <StreamOverview />,
    label: i18n.translate('xpack.streams.streamDetailView.overviewTab', {
      defaultMessage: 'Overview',
    }),
  };

  tabs.lifecycle = {
    content: (
      <StreamDetailLifecycle definition={definition} refreshDefinition={refreshDefinition} />
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
      onImportFromStream: importLifecycleFlyout?.open,
      isImportFromStreamDisabled: importLifecycleFlyout?.isDisabled,
    }),
  };

  if (queryStreams.enabled) {
    tabs.partitioning = {
      content: (
        <ClassicStreamPartitioning definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.partitioningTab', {
        defaultMessage: 'Partitioning',
      }),
    };
  }

  if (isProcessingEnabled) {
    tabs.processing = {
      content: (
        <StreamDetailEnrichment definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.processingTab', {
        defaultMessage: 'Processing',
      }),
    };
  }

  tabs.schema = {
    content: (
      <StreamDetailSchemaEditor definition={definition} refreshDefinition={refreshDefinition} />
    ),
    label: i18n.translate('xpack.streams.streamDetailView.schemaEditorTab', {
      defaultMessage: 'Schema',
    }),
  };

  tabs.dataQuality = {
    content: (
      <StreamDetailDataQuality definition={definition} refreshDefinition={refreshDefinition} />
    ),
    label: i18n.translate('xpack.streams.streamDetailView.qualityTab', {
      defaultMessage: 'Data quality',
    }),
    toolTipContent: i18n.translate('xpack.streams.managementTab.dataQuality.tooltip', {
      defaultMessage: 'View details about this classic stream’s data quality',
    }),
    'data-test-subj': 'dataQualityTab',
  };

  tabs.attachments = {
    content: <StreamDetailAttachments definition={definition} />,
    label: i18n.translate('xpack.streams.streamDetailView.attachmentsTab', {
      defaultMessage: 'Attachments',
    }),
  };

  if (tab === 'partitioning' && !queryStreams.enabled) {
    return (
      <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'lifecycle' } }} />
    );
  }

  if (tab === 'significantEvents') {
    if (isSignificantEventsLoading) {
      return null;
    }
    if (isSignificantEventsAvailable) {
      return <SignificantEventsAppRedirect tab="knowledge_indicators" stream={key} />;
    }

    if (significantEvents?.available) {
      return (
        <RedirectTo
          path="/_discovery/{tab}"
          params={{ path: { tab: 'knowledge_indicators' }, query: { stream: key } }}
        />
      );
    }

    return (
      <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'overview' } }} />
    );
  }

  if (isValidManagementSubTab(tab) && tabs[tab]?.content) {
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
  return <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'overview' } }} />;
}
