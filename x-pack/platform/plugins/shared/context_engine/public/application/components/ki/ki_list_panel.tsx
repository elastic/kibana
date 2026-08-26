/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import {
  INDEX_MANAGEMENT_LOCATOR_ID,
  type IndexManagementLocatorParams,
} from '@kbn/index-management-shared-types';
import { i18n } from '@kbn/i18n';
import { useLocatorUrl } from '@kbn/share-plugin/public';
import React, { useMemo, useState } from 'react';
import { isIndexPattern } from '../../../../common/ai_index_dest';
import { DEFAULT_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE } from '../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useKiList } from '../../hooks/use_ki_list';
import { useKibana } from '../../hooks/use_kibana';
import {
  ALL_TYPE_FILTER,
  getDiscoverEsqlQuery,
  getIndexManagementLocatorParams,
  getKiListTypeFilterLabel,
  type KiListTypeFilter,
} from './helpers';
import { KiListBody } from './ki_list_body';
import { KiListFooter } from './ki_list_footer';
import { KiListHeader } from './ki_list_header';

interface KiListPanelProps {
  aiIndex: GetAiIndexResponse;
}

export const KiListPanel = ({ aiIndex: { id: aiIndexId, dest } }: KiListPanelProps) => {
  const {
    services: { share, application },
  } = useKibana();

  const [typeFilter, setTypeFilter] = useState<KiListTypeFilter>(ALL_TYPE_FILTER);
  const [size, setSize] = useState(DEFAULT_KI_PAGE_SIZE);

  const onTypeFilterChange = (filter: KiListTypeFilter) => {
    setTypeFilter(filter);
    setSize(DEFAULT_KI_PAGE_SIZE);
  };

  const { kis, total, summary, isLoading, isFetching, error } = useKiList({
    aiIndexId,
    size,
    type: typeFilter.kind === 'type' ? typeFilter.value : undefined,
  });

  const typeFilterOptions = useMemo(
    () =>
      [{ type: ALL_TYPE_FILTER.value, count: summary.total }, ...summary.countsByType].map(
        ({ type, count }) => ({
          id: type,
          label: i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.filterType', {
            defaultMessage: '{typeLabel} ({count})',
            values: { typeLabel: getKiListTypeFilterLabel(type), count },
          }),
          'data-test-subj': `contextKiListFilter-${type}`,
        })
      ),
    [summary.total, summary.countsByType]
  );

  const loadMore = () =>
    setSize((current) => Math.min(current + DEFAULT_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE));

  const canOpenDiscover = application.capabilities.discover_v2?.show === true;
  const discoverHref = useMemo(() => {
    if (!canOpenDiscover) {
      return undefined;
    }
    const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);
    return locator?.getRedirectUrl({
      timeRange: { from: 'now-90d', to: 'now' },
      query: { esql: getDiscoverEsqlQuery(dest.value) },
    });
  }, [canOpenDiscover, dest.value, share?.url?.locators]);

  const canLinkToIndexManagement = !isIndexPattern(dest.value);
  const indexManagementLocator = canLinkToIndexManagement
    ? share.url.locators.get<IndexManagementLocatorParams>(INDEX_MANAGEMENT_LOCATOR_ID)
    : undefined;
  const indexManagementUrl = useLocatorUrl(
    indexManagementLocator,
    canLinkToIndexManagement
      ? getIndexManagementLocatorParams(dest)
      : { page: 'index_details' as const, indexName: '' },
    undefined,
    [dest, canLinkToIndexManagement]
  );
  const indexManagementHref =
    canLinkToIndexManagement && indexManagementUrl ? indexManagementUrl : undefined;

  return (
    <div data-test-subj="contextKiListPanel">
      <EuiText size="s" color="subdued" data-test-subj="contextKiListPanelDescription">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.description', {
            defaultMessage: 'The knowledge your agents retrieve.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="l" data-test-subj="contextKiListPanelContent">
        <KiListHeader
          total={summary.total}
          destValue={dest.value}
          indexManagementHref={indexManagementHref}
          discoverHref={discoverHref}
          typeFilter={typeFilter}
          typeFilterOptions={typeFilterOptions}
          onTypeFilterChange={onTypeFilterChange}
        />

        <EuiSpacer size="l" />

        <KiListBody aiIndexId={aiIndexId} kis={kis} isLoading={isLoading} error={error} />

        <KiListFooter
          loadedCount={kis.length}
          total={total}
          size={size}
          isLoading={isFetching}
          discoverHref={discoverHref}
          onLoadMore={loadMore}
        />
      </EuiPanel>
    </div>
  );
};
