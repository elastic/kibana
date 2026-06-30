/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonLoading, EuiSkeletonText, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { labels } from '../constants/i18n';
import type { ApplicationConnectionsEntityKind } from '../constants/types';

const loadingSkeletonTextStyles = css`
  display: inline-block;
  width: 200px;
`;

const headerTextStyles = css`
  min-height: 24px;
`;

export interface ApplicationConnectionsTableHeaderProps {
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  visibleCount: number;
  totalCount: number;
  entityKind: ApplicationConnectionsEntityKind;
}

export const ApplicationConnectionsTableHeader = ({
  isLoading,
  pageIndex,
  pageSize,
  visibleCount,
  totalCount,
  entityKind,
}: ApplicationConnectionsTableHeaderProps) => {
  const entityLabel =
    entityKind === 'application'
      ? labels.groupedTable.applicationsLabel
      : labels.listTable.connectionsLabel;

  return (
    <EuiSkeletonLoading
      isLoading={isLoading}
      loadingContent={<EuiSkeletonText css={loadingSkeletonTextStyles} lines={1} size="xs" />}
      loadedContent={
        <EuiText size="xs" css={headerTextStyles}>
          {visibleCount > 0 ? (
            <FormattedMessage
              id="xpack.security.management.applicationConnections.tableSummary"
              defaultMessage="Showing {start}-{end} of {total} {entityLabel}"
              values={{
                start: <strong>{pageIndex * pageSize + 1}</strong>,
                end: <strong>{Math.min((pageIndex + 1) * pageSize, visibleCount)}</strong>,
                total: totalCount,
                entityLabel: <strong>{entityLabel}</strong>,
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.security.management.applicationConnections.tableSummaryEmpty"
              defaultMessage="Showing {zero} of {total} {entityLabel}"
              values={{
                zero: <strong>{0}</strong>,
                total: totalCount,
                entityLabel: <strong>{entityLabel}</strong>,
              }}
            />
          )}
        </EuiText>
      }
    />
  );
};
