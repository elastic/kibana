/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiSkeletonTitle, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';

interface ListKiHeaderProps {
  /** Documents that match the status and search filters. */
  total: number;
  /** True only before the first data arrives. */
  isLoading: boolean;
  hasError: boolean;
  discoverHref?: string;
}

/** The row above the tiles: count and Discover link. */
export const ListKiHeader = ({ total, isLoading, hasError, discoverHref }: ListKiHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(
    () => ({
      row: css({
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        gap: `${euiTheme.size.xs} ${euiTheme.size.base}`,
        marginBottom: euiTheme.size.base,
      }),
      countSkeleton: css({
        width: euiTheme.base * 15,
      }),
    }),
    [euiTheme]
  );

  return (
    <div css={styles.row} data-test-subj="contextListKiHeader">
      {isLoading ? (
        <EuiSkeletonTitle
          size="xs"
          css={styles.countSkeleton}
          data-test-subj="contextListKiHeaderCountLoading"
        />
      ) : null}
      {/* The list shows the error; a count of 0 next to it would be wrong. */}
      {!isLoading && !hasError ? (
        <EuiText size="m">
          <h3 data-test-subj="contextListKiHeaderCount">
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.listKi.headerCount"
              defaultMessage="{count, plural, one {# Knowledge document} other {# Knowledge documents}}"
              values={{ count: total }}
            />
          </h3>
        </EuiText>
      ) : null}
      {discoverHref ? (
        <EuiLink
          href={discoverHref}
          target="_blank"
          rel="noopener noreferrer"
          data-test-subj="contextListKiHeaderDiscoverLink"
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
            action: CONTEXT_ENGINE_UI_EBT.action.listKi.DISCOVER_LINK,
          })}
        >
          {/* EuiLink adds the external icon itself for target="_blank". */}
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.listKi.headerDiscoverLink"
            defaultMessage="View raw docs in Discover"
          />
        </EuiLink>
      ) : null}
    </div>
  );
};
