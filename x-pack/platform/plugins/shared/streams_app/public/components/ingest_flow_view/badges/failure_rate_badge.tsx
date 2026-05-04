/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiNotificationBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatRate } from '../edges/throughput_edge';

export interface FailureRateBadgeProps {
  streamName: string;
  failureRate: { docsPerSec: number };
  onClickDiscover?: () => void;
}

export const FailureRateBadge: React.FC<FailureRateBadgeProps> = ({
  failureRate,
  onClickDiscover,
}) => {
  const formatted = formatRate(failureRate.docsPerSec).replace('/s', '');
  const tooltipContent = i18n.translate('xpack.streams.ingestFlow.failureRateBadge.tooltip', {
    defaultMessage: '{rate} docs/sec failing ingest. {clickText}',
    values: {
      rate: formatted,
      clickText: onClickDiscover
        ? i18n.translate('xpack.streams.ingestFlow.failureRateBadge.clickToView', {
            defaultMessage: 'Click to view in Discover.',
          })
        : '',
    },
  });

  const badge = (
    <EuiNotificationBadge
      color="danger"
      onClick={onClickDiscover}
      aria-label={i18n.translate('xpack.streams.ingestFlow.failureRateBadge.ariaLabel', {
        defaultMessage: '{rate} docs/sec failing ingest',
        values: { rate: formatted },
      })}
    >
      {formatted}
    </EuiNotificationBadge>
  );

  return (
    <EuiToolTip content={tooltipContent} position="top">
      {badge}
    </EuiToolTip>
  );
};
