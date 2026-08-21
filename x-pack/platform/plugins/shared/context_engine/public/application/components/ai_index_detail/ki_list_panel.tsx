/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonGroup,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE } from '../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useDataConnectors } from '../../hooks/use_data_connectors';
import { useKiList } from '../../hooks/use_ki_list';
import { useKibana } from '../../hooks/use_kibana';
import { getKiTypeLabel } from '../../utils/ki_type_labels';
import { KiRow } from './ki_row';

interface KiListPanelProps {
  aiIndex: GetAiIndexResponse;
}

type KiListTypeFilter = { kind: 'all' } | { kind: 'type'; type: string };

const getDiscoverEsqlQuery = (destValue: string): string => `FROM ${destValue} | LIMIT 100`;

export const KiListPanel = ({ aiIndex }: KiListPanelProps) => {
  const {
    services: { share, application },
  } = useKibana();

  const destValue = aiIndex.dest.value;

  const [typeFilter, setTypeFilter] = useState<KiListTypeFilter>({ kind: 'all' });
  const [size, setSize] = useState(DEFAULT_KI_PAGE_SIZE);

  const hasConnectorSources = useMemo(
    () => aiIndex.sources.some((source) => source.type === 'connector'),
    [aiIndex.sources]
  );
  const { connectorNameById } = useDataConnectors({ enabled: hasConnectorSources });

  const defaultSourceLabel = useMemo(() => {
    const firstSource = aiIndex.sources[0];
    if (firstSource === undefined) {
      return undefined;
    }
    if (firstSource.type === 'connector') {
      return connectorNameById.get(firstSource.value) ?? firstSource.value;
    }
    return i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.defaultSourceLabel', {
      defaultMessage: 'ES|QL',
    });
  }, [aiIndex.sources, connectorNameById]);

  const listType = typeFilter.kind === 'type' ? typeFilter.type : undefined;

  useEffect(() => {
    setSize(DEFAULT_KI_PAGE_SIZE);
  }, [typeFilter]);

  const { kis, total, totalAll, countsByType, isLoading, error } = useKiList({
    aiIndexId: aiIndex.id,
    size,
    type: listType,
  });

  const typeFilterCounts = countsByType;

  const selectedFilterId = typeFilter.kind === 'all' ? 'all' : typeFilter.type;

  const typeFilterOptions = useMemo(
    () => [
      {
        id: 'all',
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.filterAll', {
          defaultMessage: 'All ({count})',
          values: { count: totalAll },
        }),
        'data-test-subj': 'contextKiListFilter-all',
      },
      ...typeFilterCounts.map(({ type, count }) => ({
        id: type,
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.filterType', {
          defaultMessage: '{typeLabel} ({count})',
          values: { typeLabel: getKiTypeLabel(type), count },
        }),
        'data-test-subj': `contextKiListFilter-${type}`,
      })),
    ],
    [totalAll, typeFilterCounts]
  );

  const hasMore = kis.length < total;
  const canLoadMore = hasMore && size < MAX_KI_PAGE_SIZE;
  const capReached = hasMore && size >= MAX_KI_PAGE_SIZE;
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
      query: { esql: getDiscoverEsqlQuery(destValue) },
    });
  }, [canOpenDiscover, destValue, share?.url?.locators]);

  const resolveSourceLabel = (sourceLabel: string | undefined) => sourceLabel ?? defaultSourceLabel;

  return (
    <div data-test-subj="contextKiListPanel">
      <EuiText size="s" color="subdued" data-test-subj="contextKiListPanelDescription">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.description', {
            defaultMessage:
              'The knowledge your agents retrieve. Each indicator shows the automation and sources it came from.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="l" data-test-subj="contextKiListPanelContent">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" data-test-subj="contextKiListPanelSummary">
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.kiList.summary"
                defaultMessage="{count, plural, one {# <strong>Knowledge Indicator</strong>} other {# <strong>Knowledge Indicators</strong>}} in"
                values={{
                  count: totalAll,
                  strong: (chunks) => <strong>{chunks}</strong>,
                }}
              />{' '}
              <EuiBadge color="hollow" data-test-subj="contextKiListPanelDest">
                {destValue}
              </EuiBadge>
            </EuiText>
          </EuiFlexItem>
          {discoverHref && (
            <EuiFlexItem grow={false}>
              <EuiLink
                href={discoverHref}
                target="_blank"
                rel="noopener noreferrer"
                data-test-subj="contextKiListDiscoverLink"
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.kiList.discoverLink"
                  defaultMessage="View raw docs in Discover"
                />
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {typeFilterOptions.length > 1 && (
          <>
            <EuiSpacer size="m" />
            <EuiButtonGroup
              legend={i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.typeFilterLegend', {
                defaultMessage: 'Filter Knowledge Indicators by type',
              })}
              type="single"
              buttonSize="compressed"
              idSelected={selectedFilterId}
              onChange={(id) => {
                if (id === 'all') {
                  setTypeFilter({ kind: 'all' });
                  return;
                }
                setTypeFilter({ kind: 'type', type: id });
              }}
              options={typeFilterOptions}
              data-test-subj="contextKiListTypeFilters"
            />
          </>
        )}

        <EuiSpacer size="l" />

        {isLoading && kis.length === 0 ? (
          <EuiSkeletonText lines={4} data-test-subj="contextKiListLoading" />
        ) : error ? (
          <EuiText size="s" color="danger" data-test-subj="contextKiListError">
            <p>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.error', {
                defaultMessage: 'Unable to load Knowledge Indicators.',
              })}
            </p>
          </EuiText>
        ) : kis.length === 0 ? (
          <EuiEmptyPrompt
            iconType="document"
            titleSize="xs"
            data-test-subj="contextKiListEmpty"
            title={
              <h3>
                {i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.emptyTitle', {
                  defaultMessage: 'No Knowledge Indicators found',
                })}
              </h3>
            }
            body={
              <p>
                {i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.emptyBody', {
                  defaultMessage: 'Try adjusting your type filter.',
                })}
              </p>
            }
          />
        ) : (
          <div data-test-subj="contextKiListRows" role="list">
            {kis.map((ki, index) => (
              <React.Fragment key={ki.ki_id}>
                <div role="listitem">
                  <KiRow ki={ki} sourceLabel={resolveSourceLabel(ki.source_label)} />
                </div>
                {index < kis.length - 1 && (
                  <>
                    <EuiSpacer size="m" />
                    <EuiHorizontalRule margin="none" />
                    <EuiSpacer size="m" />
                  </>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {canLoadMore && (
          <>
            <EuiSpacer size="l" />
            <EuiFlexGroup justifyContent="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  onClick={loadMore}
                  isLoading={isLoading}
                  data-test-subj="contextKiListLoadMoreButton"
                >
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.loadMoreButton', {
                    defaultMessage: 'Load more',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}

        {capReached && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="xs" color="subdued" data-test-subj="contextKiListCapReached">
              <p>
                {i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.capReached', {
                  defaultMessage:
                    'Showing the first {count} results. Use a type filter to find more.',
                  values: { count: MAX_KI_PAGE_SIZE },
                })}
              </p>
            </EuiText>
          </>
        )}
      </EuiPanel>
    </div>
  );
};
