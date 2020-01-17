/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo } from 'react';
import { EuiHealth, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { MULTI_BUCKET_IMPACT } from '../../../../../common/constants/multi_bucket_impact';
import { getSeverityColor } from '../../../../../common/util/anomaly_utils';

interface SeverityCellProps {
  /**
   * Severity score.
   */
  score: number;
  /**
   * Multi-bucket impact score from –5 to 5.
   * Anomalies with a multi-bucket impact value of greater than or equal
   * to 2 are indicated with a plus shaped symbol in the cell.
   */
  multiBucketImpact: number;
}

/**
 * Renders anomaly severity score with single or multi-bucket impact marker.
 */
export const SeverityCell: FC<SeverityCellProps> = memo(({ score, multiBucketImpact }) => {
  const severity = score >= 1 ? Math.floor(score) : '< 1';
  const color = getSeverityColor(score);
  const isMultiBucket = multiBucketImpact >= MULTI_BUCKET_IMPACT.MEDIUM;
  return isMultiBucket ? (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <svg width="16" height="16" viewBox="-2 -2 20 20" fill={color}>
          <path
            d="M-6.708203932499369,-2.23606797749979H-2.23606797749979V-6.708203932499369H2.23606797749979V-2.23606797749979H6.708203932499369V2.23606797749979H2.23606797749979V6.708203932499369H-2.23606797749979V2.23606797749979H-6.708203932499369Z"
            transform="translate(8,8)"
          />
        </svg>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{severity}</EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiHealth color={color}>{severity}</EuiHealth>
  );
});
