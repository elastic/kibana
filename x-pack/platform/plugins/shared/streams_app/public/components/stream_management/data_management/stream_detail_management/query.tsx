/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { AppHeaderBadge, AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import type { Streams } from '@kbn/streams-schema';
import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import { useAbortController } from '@kbn/react-hooks';
import React, { useCallback, useMemo, useState } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppParams } from '../../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../../../hooks/use_streams_privileges';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { QueryStreamSchemaEditor } from '../../../query_streams/query_stream_schema_editor';
import { RedirectTo } from '../../../redirect_to';
import { QueryStreamBadge, useDiscoverStreamLink } from '../../../stream_badges';
import { StreamDeleteModal } from '../../../stream_delete_modal';
import { StreamDetailAttachments } from '../../../stream_detail_attachments';
import { StreamOverview } from '../../../stream_detail_overview';
import { StreamsAppHeader, StreamsAppPageTemplate } from '../../../streams_app_page_template';
import type { ManagementTabs } from './wrapper';
import { QueryStreamPartitioning } from '../stream_detail_routing/query_stream_partitioning';

const queryStreamManagementSubTabs = ['overview', 'partitioning', 'schema', 'attachments'] as const;

type QueryStreamManagementSubTab = (typeof queryStreamManagementSubTabs)[number];

function isValidManagementSubTab(value: string): value is QueryStreamManagementSubTab {
  return queryStreamManagementSubTabs.includes(value as QueryStreamManagementSubTab);
}

export function QueryStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: Streams.QueryStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    core: {
      application: { navigateToApp },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const router = useStreamsAppRouter();
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}');
  const { rangeFrom, rangeTo } = useTimeRange();
  const {
    ui,
    features: { significantEvents },
    isLoading: isPrivilegesLoading,
  } = useStreamsPrivileges();

  const canDeleteQueryStream = ui[STREAMS_UI_PRIVILEGES.manage];

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const abortController = useAbortController();

  const tabs: ManagementTabs = {};

  tabs.overview = {
    content: <StreamOverview />,
    label: i18n.translate('xpack.streams.streamDetailView.overviewTab', {
      defaultMessage: 'Overview',
    }),
  };

  tabs.partitioning = {
    content: (
      <QueryStreamPartitioning definition={definition} refreshDefinition={refreshDefinition} />
    ),
    label: i18n.translate('xpack.streams.streamDetailView.partitioningTab', {
      defaultMessage: 'Partitioning',
    }),
  };

  tabs.schema = {
    content: (
      <QueryStreamSchemaEditor definition={definition} refreshDefinition={refreshDefinition} />
    ),
    label: i18n.translate('xpack.streams.streamDetailView.schemaEditorTab', {
      defaultMessage: 'Schema',
    }),
  };

  tabs.attachments = {
    content: <StreamDetailAttachments definition={definition} />,
    label: i18n.translate('xpack.streams.streamDetailView.attachmentsTab', {
      defaultMessage: 'Attachments',
    }),
  };

  const backToStreamsLabel = i18n.translate('xpack.streams.streamDetailView.backToStreamsLabel', {
    defaultMessage: 'Streams',
  });

  const badges: AppHeaderBadge[] = [
    {
      label: i18n.translate('xpack.streams.entityDetailViewWithoutParams.queryBadgeLabel', {
        defaultMessage: 'Query',
      }),
      renderCustomBadge: () => <QueryStreamBadge />,
    },
  ];

  const discoverHref = useDiscoverStreamLink({ stream: definition.stream, hasDataStream: true });

  const deleteStream = useCallback(async () => {
    await streamsRepositoryClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
      params: { path: { name: definition.stream.name } },
      signal: abortController.signal,
    });
    navigateToApp('/streams');
  }, [definition.stream.name, abortController.signal, navigateToApp, streamsRepositoryClient]);

  const appHeaderMenu = useMemo<AppHeaderMenu | undefined>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [];
    if (canDeleteQueryStream) {
      items.push({
        id: 'delete',
        order: 1,
        label: i18n.translate('xpack.streams.streamDetailActionsMenu.deleteStreamLabel', {
          defaultMessage: 'Delete stream',
        }),
        iconType: 'trash',
        overflow: true,
        isDestructive: true,
        testId: 'streamsDeleteStreamButton',
        run: () => setShowDeleteModal(true),
      });
    }

    const primaryActionItem = discoverHref
      ? {
          id: 'discover',
          label: i18n.translate('xpack.streams.streamDetailView.viewInDiscoverLabel', {
            defaultMessage: 'View in Discover',
          }),
          iconType: 'discoverApp',
          href: discoverHref,
          testId: `streamsDiscoverActionButton-${definition.stream.name}`,
        }
      : undefined;

    if (!primaryActionItem && items.length === 0) {
      return undefined;
    }

    return {
      ...(primaryActionItem ? { primaryActionItem } : {}),
      ...(items.length ? { items } : {}),
    };
  }, [canDeleteQueryStream, discoverHref, definition.stream.name]);

  const appHeaderTabs: AppHeaderTab[] = Object.entries(tabs).map(([tabKey, { label }]) => ({
    id: tabKey,
    label,
    href: router.link('/{key}/management/{tab}', {
      path: { key, tab: tabKey },
      query: { rangeFrom, rangeTo },
    }),
    isSelected: tab === tabKey,
    'data-test-subj': `queryStreamDetails-${tabKey}-tab`,
  }));

  if (tab === 'significantEvents') {
    if (isPrivilegesLoading) {
      return null;
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

  if (!isValidManagementSubTab(tab) || !tabs[tab]?.content) {
    return (
      <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'overview' } }} />
    );
  }

  return (
    <>
      <StreamsAppHeader
        title={key}
        back={{ href: router.link('/'), label: backToStreamsLabel }}
        badges={badges}
        tabs={appHeaderTabs}
        menu={appHeaderMenu}
      />
      <StreamsAppPageTemplate.Body>{tabs[tab].content}</StreamsAppPageTemplate.Body>
      {showDeleteModal && (
        <StreamDeleteModal
          name={definition.stream.name}
          onClose={() => setShowDeleteModal(false)}
          onCancel={() => setShowDeleteModal(false)}
          onDelete={deleteStream}
        />
      )}
    </>
  );
}
