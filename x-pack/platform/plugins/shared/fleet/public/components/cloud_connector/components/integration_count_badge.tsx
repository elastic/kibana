/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiBadge, EuiToolTip, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { useCloudConnectorUsage } from '../hooks/use_cloud_connector_usage';

interface IntegrationCountBadgeProps {
  cloudConnectorId: string;
  count: number;
}

const MAX_VISIBLE_POLICIES = 10;

const TooltipContent: React.FC<{
  cloudConnectorId: string;
  count: number;
}> = ({ cloudConnectorId, count }) => {
  const { data, isLoading, isError } = useCloudConnectorUsage(
    cloudConnectorId,
    1,
    MAX_VISIBLE_POLICIES,
    { staleTime: 0 } // Always fetch fresh data for tooltip
  );

  if (isLoading) {
    return (
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: 8px;
        `}
      >
        <EuiLoadingSpinner size="s" />
        <span>
          {i18n.translate('xpack.fleet.cloudConnector.integrationCountBadge.loading', {
            defaultMessage: 'Loading...',
          })}
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <EuiText size="s" color="danger">
        {i18n.translate('xpack.fleet.cloudConnector.integrationCountBadge.error', {
          defaultMessage: 'Failed to load integrations',
        })}
      </EuiText>
    );
  }

  const items = data?.items || [];
  const total = data?.total || count;
  const hasMore = total > MAX_VISIBLE_POLICIES;

  return (
    <div>
      <ul
        css={css`
          margin: 0;
          padding-left: 16px;
        `}
      >
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      {hasMore && (
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.fleet.cloudConnector.integrationCountBadge.andMore', {
            defaultMessage: '+{remaining} more',
            values: { remaining: total - MAX_VISIBLE_POLICIES },
          })}
        </EuiText>
      )}
    </div>
  );
};

export const IntegrationCountBadge: React.FC<IntegrationCountBadgeProps> = ({
  cloudConnectorId,
  count,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const badgeLabel = i18n.translate('xpack.fleet.cloudConnector.integrationCountBadge.label', {
    defaultMessage: 'Used by {count, plural, one {# integration} other {# integrations}}',
    values: { count },
  });

  const badge = <EuiBadge color="default">{badgeLabel}</EuiBadge>;

  // No tooltip for 0 integrations
  if (count === 0) {
    return badge;
  }

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <EuiToolTip
        delay="long"
        position="top"
        content={
          isHovered ? <TooltipContent cloudConnectorId={cloudConnectorId} count={count} /> : null
        }
      >
        {badge}
      </EuiToolTip>
    </div>
  );
};
