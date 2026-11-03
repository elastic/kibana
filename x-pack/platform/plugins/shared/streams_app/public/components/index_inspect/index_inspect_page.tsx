/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderBadge, AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import { isEnabledFailureStore } from '@kbn/streams-schema';
import { RedirectTo } from '../redirect_to';
import { StreamsAppHeader, StreamsAppPageTemplate } from '../streams_app_page_template';
import { LifecycleBadge, useDiscoverStreamLink } from '../stream_badges';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useTimeRange } from '../../hooks/use_time_range';
import { IndexInspectPanels } from './index_inspect_panels';
import { IndexQualityBadge } from './index_quality_badge';
import {
  INDEX_INSPECT_TAB_LABELS,
  INDEX_INSPECT_TABS,
  getIndexInspectTargetKind,
  getUnavailableTabTooltip,
  isIndexInspectTabAvailable,
  resolveIndexInspectTab,
} from './types';
import { useIndexManagementLink } from './use_index_management_link';
import { useIndexMetadata } from './use_index_metadata';

export function IndexInspectPage() {
  const {
    path: { indexName, tab },
  } = useStreamsAppParams('/new-experience/indices/{indexName}/{tab}');
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const {
    features: { canvas },
  } = useStreamsPrivileges();
  const { value: metadata, loading: metadataLoading } = useIndexMetadata(indexName);
  const exists = metadata?.exists ?? false;
  const targetKind = getIndexInspectTargetKind({ metadata, metadataLoading });
  const canReadFailureStore = metadata?.privileges.read_failure_store ?? false;
  const discoverLink = useDiscoverStreamLink({ indexName, hasDataStream: exists });
  const stackManagementLink = useIndexManagementLink(indexName, metadata?.is_data_stream ?? false);

  const selectedTab = resolveIndexInspectTab(tab, targetKind);

  const badges = useMemo<AppHeaderBadge[]>(() => {
    if (!metadata?.is_data_stream) {
      return [];
    }
    return [
      {
        label: i18n.translate('xpack.streams.indexInspect.page.qualityBadge', {
          defaultMessage: 'Data quality',
        }),
        renderCustomBadge: () => (
          <IndexQualityBadge
            indexName={indexName}
            canReadFailureStore={canReadFailureStore}
            failureStoreEnabled={isEnabledFailureStore(metadata.effective_failure_store)}
          />
        ),
      },
      {
        label: i18n.translate('xpack.streams.indexInspect.page.retentionBadge', {
          defaultMessage: 'Data Retention',
        }),
        renderCustomBadge: () => (
          <LifecycleBadge
            lifecycle={metadata.lifecycle}
            dataTestSubj={`lifecycleBadge-${indexName}`}
          />
        ),
      },
    ];
  }, [canReadFailureStore, indexName, metadata]);

  const tabs = useMemo<AppHeaderTab[]>(
    () =>
      INDEX_INSPECT_TABS.map((tabId) => {
        const available = isIndexInspectTabAvailable(tabId, targetKind);
        return {
          id: tabId,
          label: INDEX_INSPECT_TAB_LABELS[tabId],
          href: available
            ? router.link('/new-experience/indices/{indexName}/{tab}', {
                path: { indexName, tab: tabId },
                query: { rangeFrom, rangeTo },
              })
            : undefined,
          isSelected: selectedTab === tabId,
          disabled: !available,
          toolTipContent: available ? undefined : getUnavailableTabTooltip(targetKind),
          'data-test-subj': `streamsIndexInspectTab-${tabId}`,
        };
      }),
    [indexName, rangeFrom, rangeTo, router, selectedTab, targetKind]
  );

  const menu = useMemo<AppHeaderMenu | undefined>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [];

    if (stackManagementLink) {
      items.push({
        id: 'stackManagement',
        order: 1,
        label: i18n.translate(
          'xpack.streams.indexInspect.page.manageInStackManagementButtonLabel',
          {
            defaultMessage: 'Manage in Stack Management',
          }
        ),
        iconType: 'managementApp',
        href: stackManagementLink,
        overflow: true,
        testId: `streamsIndexInspectStackManagementButton-${indexName}`,
      });
    }

    const primaryActionItem = discoverLink
      ? {
          id: 'discover',
          label: i18n.translate('xpack.streams.indexInspect.page.viewInDiscover', {
            defaultMessage: 'View in Discover',
          }),
          iconType: 'productDiscover' as const,
          href: discoverLink,
          testId: `streamsIndexInspectDiscoverButton-${indexName}`,
        }
      : undefined;

    if (!primaryActionItem && items.length === 0) {
      return undefined;
    }

    return {
      ...(primaryActionItem ? { primaryActionItem } : {}),
      ...(items.length > 0 ? { items } : {}),
    };
  }, [discoverLink, indexName, stackManagementLink]);

  if (!canvas.enabled) {
    return <RedirectTo path="/" />;
  }

  if (tab !== selectedTab) {
    return (
      <RedirectTo
        path="/new-experience/indices/{indexName}/{tab}"
        params={{ path: { tab: selectedTab } }}
      />
    );
  }

  return (
    <>
      <StreamsAppHeader
        title={indexName}
        back={{
          href: router.link('/new-experience/{tab}', {
            path: { tab: 'destinations' },
            query: { rangeFrom, rangeTo },
          }),
          label: i18n.translate('xpack.streams.indexInspect.page.backToDestinations', {
            defaultMessage: 'Destinations',
          }),
        }}
        badges={badges}
        tabs={tabs}
        menu={menu}
      />
      <StreamsAppPageTemplate.Body paddingSize="m">
        <IndexInspectPanels
          indexName={indexName}
          tab={selectedTab}
          metadata={metadata}
          metadataLoading={metadataLoading}
          canReadFailureStore={canReadFailureStore}
        />
      </StreamsAppPageTemplate.Body>
    </>
  );
}
