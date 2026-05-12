/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiBadge, EuiToolTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
}

interface RateLimitStatusProps {
  operation: 'exploration' | 'validation' | 'approval';
  lastResponse?: {
    headers?: {
      'x-ratelimit-limit'?: string;
      'x-ratelimit-remaining'?: string;
      'x-ratelimit-reset'?: string;
    };
  };
}

/**
 * Display rate limit status for AESOP operations
 *
 * Shows remaining requests and reset time as a badge.
 * Color-coded based on remaining capacity:
 * - Green: >50% remaining
 * - Warning: 20-50% remaining
 * - Danger: <20% remaining
 */
export const RateLimitStatus: React.FC<RateLimitStatusProps> = ({ operation, lastResponse }) => {
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);

  useEffect(() => {
    if (lastResponse?.headers) {
      const limit = parseInt(lastResponse.headers['x-ratelimit-limit'] || '0', 10);
      const remaining = parseInt(lastResponse.headers['x-ratelimit-remaining'] || '0', 10);
      const resetAt = lastResponse.headers['x-ratelimit-reset']
        ? new Date(lastResponse.headers['x-ratelimit-reset']).getTime()
        : Date.now() + 3600000;

      if (limit > 0) {
        setRateLimit({ limit, remaining, resetAt });
      }
    }
  }, [lastResponse]);

  if (!rateLimit) {
    return null;
  }

  const percentage = (rateLimit.remaining / rateLimit.limit) * 100;

  const color = percentage > 50 ? 'success' : percentage > 20 ? 'warning' : 'danger';

  const resetTime = new Date(rateLimit.resetAt).toLocaleTimeString();

  const operationLabels = {
    exploration: i18n.translate('xpack.evals.aesop.rateLimit.exploration', {
      defaultMessage: 'Explorations',
    }),
    validation: i18n.translate('xpack.evals.aesop.rateLimit.validation', {
      defaultMessage: 'Validations',
    }),
    approval: i18n.translate('xpack.evals.aesop.rateLimit.approval', {
      defaultMessage: 'Approvals',
    }),
  };

  const tooltipContent = (
    <div>
      <EuiText size="xs">
        <p>
          <strong>{operationLabels[operation]}</strong>
        </p>
        <p>
          {i18n.translate('xpack.evals.aesop.rateLimit.remaining', {
            defaultMessage: '{remaining} of {limit} remaining',
            values: { remaining: rateLimit.remaining, limit: rateLimit.limit },
          })}
        </p>
        <p>
          {i18n.translate('xpack.evals.aesop.rateLimit.resetsAt', {
            defaultMessage: 'Resets at {time}',
            values: { time: resetTime },
          })}
        </p>
      </EuiText>
    </div>
  );

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiBadge color={color}>
        {rateLimit.remaining}/{rateLimit.limit}
      </EuiBadge>
    </EuiToolTip>
  );
};

/**
 * Compact version showing just the remaining count
 */
export const RateLimitStatusCompact: React.FC<RateLimitStatusProps> = ({
  operation,
  lastResponse,
}) => {
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);

  useEffect(() => {
    if (lastResponse?.headers) {
      const limit = parseInt(lastResponse.headers['x-ratelimit-limit'] || '0', 10);
      const remaining = parseInt(lastResponse.headers['x-ratelimit-remaining'] || '0', 10);
      const resetAt = lastResponse.headers['x-ratelimit-reset']
        ? new Date(lastResponse.headers['x-ratelimit-reset']).getTime()
        : Date.now() + 3600000;

      if (limit > 0) {
        setRateLimit({ limit, remaining, resetAt });
      }
    }
  }, [lastResponse]);

  if (!rateLimit) {
    return null;
  }

  const resetTime = new Date(rateLimit.resetAt).toLocaleTimeString();
  const percentage = (rateLimit.remaining / rateLimit.limit) * 100;
  const color = percentage > 50 ? 'success' : percentage > 20 ? 'warning' : 'danger';

  return (
    <EuiToolTip
      content={i18n.translate('xpack.evals.aesop.rateLimit.compactTooltip', {
        defaultMessage: '{remaining} remaining (resets at {time})',
        values: { remaining: rateLimit.remaining, time: resetTime },
      })}
    >
      <EuiBadge color={color} iconType="clock">
        {rateLimit.remaining}
      </EuiBadge>
    </EuiToolTip>
  );
};
