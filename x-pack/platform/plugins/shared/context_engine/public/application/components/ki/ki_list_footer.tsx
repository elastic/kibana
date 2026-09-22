/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { MAX_KI_PAGE_SIZE } from '../../../../common/constants';

interface KiListFooterProps {
  loadedCount: number;
  total: number;
  size: number;
  isLoading: boolean;
  discoverHref?: string;
  onLoadMore: () => void;
}

export const KiListFooter = ({
  loadedCount,
  total,
  size,
  isLoading,
  discoverHref,
  onLoadMore,
}: KiListFooterProps) => {
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
              {discoverHref ? (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.kiList.capReachedWithDiscover"
                  defaultMessage="Showing the first {count} results. {discoverLink} to view all Knowledge Indicators."
                  values={{
                    count: MAX_KI_PAGE_SIZE,
                    discoverLink: (
                      <EuiLink
                        href={discoverHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-test-subj="contextKiListCapReachedDiscoverLink"
                      >
                        <FormattedMessage
                          id="xpack.contextEngine.aiIndexDetail.kiList.capReachedDiscoverLink"
                          defaultMessage="Open in Discover"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              ) : (
                i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.capReached', {
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
