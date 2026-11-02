/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { MAX_KI_PAGE_SIZE } from '../../../../../common/constants';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';

interface ListKiFooterProps {
  loadedCount: number;
  total: number;
  size: number;
  isLoading: boolean;
  discoverHref?: string;
  onLoadMore: () => void;
}

export const ListKiFooter = ({
  loadedCount,
  total,
  size,
  isLoading,
  discoverHref,
  onLoadMore,
}: ListKiFooterProps) => {
  const hasMore = loadedCount < total;
  const canLoadMore = hasMore && size < MAX_KI_PAGE_SIZE;
  const capReached = hasMore && size >= MAX_KI_PAGE_SIZE;

  if (!canLoadMore && !capReached) {
    return null;
  }

  return (
    <>
      {canLoadMore && (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={onLoadMore}
                isLoading={isLoading}
                data-test-subj="contextListKiLoadMoreButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.listKi.LOAD_MORE,
                })}
              >
                {i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.loadMoreButton', {
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
          <EuiText size="xs" color="subdued" data-test-subj="contextListKiCapReached">
            <p>
              {discoverHref ? (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.listKi.capReachedWithDiscover"
                  defaultMessage="Showing the first {count} results. {discoverLink} to view all Knowledge Indicators."
                  values={{
                    count: MAX_KI_PAGE_SIZE,
                    discoverLink: (
                      <EuiLink
                        href={discoverHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-test-subj="contextListKiCapReachedDiscoverLink"
                        {...getEbtProps({
                          element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
                          action: CONTEXT_ENGINE_UI_EBT.action.listKi.DISCOVER_CAP_REACHED,
                        })}
                      >
                        <FormattedMessage
                          id="xpack.contextEngine.aiIndexDetail.listKi.capReachedDiscoverLink"
                          defaultMessage="Open in Discover"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              ) : (
                i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.capReached', {
                  defaultMessage: 'Showing the first {count} results.',
                  values: { count: MAX_KI_PAGE_SIZE },
                })
              )}
            </p>
          </EuiText>
        </>
      )}
    </>
  );
};
