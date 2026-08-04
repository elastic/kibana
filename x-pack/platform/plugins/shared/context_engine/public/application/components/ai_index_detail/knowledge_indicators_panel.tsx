/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import {
  INDEX_MANAGEMENT_LOCATOR_ID,
  type IndexManagementLocatorParams,
} from '@kbn/index-management-shared-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLocatorUrl } from '@kbn/share-plugin/public';
import React, { useMemo } from 'react';
import type { AiIndexDest, GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useAiIndexKiSummary } from '../../hooks/use_ai_index_ki_summary';
import { useKibana } from '../../hooks/use_kibana';
import { getKiTypeLabel } from '../../utils/ki_type_labels';

interface KnowledgeIndicatorsPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
}

const getDiscoverEsqlQuery = (destValue: string): string => `FROM ${destValue} | LIMIT 100`;

const kiTypeLabelStyle = css`
  text-transform: capitalize;
`;

const getIndexManagementLocatorParams = (dest: AiIndexDest): IndexManagementLocatorParams => {
  const name = dest.value.replace(/\*$/, '');

  if (dest.type === 'data_stream') {
    return { page: 'data_streams_details', dataStreamName: name };
  }

  return { page: 'index_details', indexName: name };
};

export const KnowledgeIndicatorsPanel = ({
  isLoading: isLoadingAiIndex,
  aiIndex,
}: KnowledgeIndicatorsPanelProps) => {
  const {
    services: { share, application },
  } = useKibana();
  const { kiSummary, isLoading: isLoadingKiSummary, error } = useAiIndexKiSummary(aiIndex?.id);

  const isLoading = isLoadingAiIndex || isLoadingKiSummary;
  const dest = kiSummary?.dest ?? aiIndex?.dest;
  const destValue = dest?.value;
  const totalCount = kiSummary?.count ?? 0;
  const canOpenDiscover = application.capabilities.discover_v2?.show === true;
  const typeCounts = kiSummary?.counts_by_type ?? [];

  const indexManagementLocator = dest
    ? share.url.locators.get<IndexManagementLocatorParams>(INDEX_MANAGEMENT_LOCATOR_ID)
    : undefined;
  const indexManagementUrl = useLocatorUrl(
    indexManagementLocator,
    dest
      ? getIndexManagementLocatorParams(dest)
      : { page: 'index_details' as const, indexName: '' },
    undefined,
    [dest]
  );
  const indexManagementHref = indexManagementUrl || undefined;

  const discoverHref = useMemo(() => {
    if (!destValue || !canOpenDiscover) {
      return undefined;
    }

    const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);
    return locator?.getRedirectUrl({
      timeRange: { from: 'now-90d', to: 'now' },
      query: { esql: getDiscoverEsqlQuery(destValue) },
    });
  }, [canOpenDiscover, destValue, share?.url?.locators]);

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextAiIndexKiPanel">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.knowledgeIndicators.title"
                defaultMessage="Knowledge Indicators"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        {!isLoading && !error && destValue && (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" data-test-subj="contextAiIndexKiHeaderSummary">
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.knowledgeIndicators.headerSummary"
                defaultMessage="{count} KI's stored in {indexLink}"
                values={{
                  count: <strong>{totalCount.toLocaleString()}</strong>,
                  indexLink: indexManagementHref ? (
                    <EuiLink href={indexManagementHref} data-test-subj="contextAiIndexKiIndexLink">
                      {destValue}
                    </EuiLink>
                  ) : (
                    <code>{destValue}</code>
                  ),
                }}
              />
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.knowledgeIndicators.description"
            defaultMessage="Every Knowledge Indicator published to this index."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {isLoading ? (
        <EuiSkeletonText lines={2} data-test-subj="contextAiIndexKiLoading" />
      ) : error ? (
        <EuiText size="s" color="danger" data-test-subj="contextAiIndexKiError">
          <p>
            {i18n.translate('xpack.contextEngine.aiIndexDetail.knowledgeIndicators.error', {
              defaultMessage: 'Unable to load Knowledge Indicator count.',
            })}
          </p>
        </EuiText>
      ) : (
        <>
          {(typeCounts.length > 0 || discoverHref) && (
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                {typeCounts.length > 0 && (
                  <EuiFlexGroup gutterSize="xl" responsive={false} wrap>
                    {typeCounts.map(({ type, count }) => (
                      <EuiFlexItem key={type} grow={false}>
                        <div data-test-subj={`contextAiIndexKiTypeCount-${type}`}>
                          <EuiText size="m">
                            <strong>{count.toLocaleString()}</strong>
                          </EuiText>
                          <EuiText size="xs" color="subdued" css={kiTypeLabelStyle}>
                            {getKiTypeLabel(type)}
                          </EuiText>
                        </div>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                )}
              </EuiFlexItem>
              {discoverHref && (
                <EuiFlexItem grow={false}>
                  <EuiLink
                    href={discoverHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-test-subj="contextAiIndexKiDiscoverLink"
                  >
                    <FormattedMessage
                      id="xpack.contextEngine.aiIndexDetail.knowledgeIndicators.discoverLink"
                      defaultMessage="Open in Discover"
                    />
                  </EuiLink>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          )}
        </>
      )}
    </EuiPanel>
  );
};
