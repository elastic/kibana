/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiHealth, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getSeverityColor, getFormattedSeverityScore } from '@kbn/ml-anomaly-utils';

interface SeverityCellProps {
  /**
   * Severity score.
   */
  score: number;
  /**
   * Flag to indicate whether the anomaly should be displayed in the cell as a
   * multi-bucket anomaly with a plus-shaped symbol.
   */
  isMultiBucketAnomaly: boolean;
}

/**
 * Renders anomaly severity score with single or multi-bucket impact marker.
 */
export const SeverityCell: FC<SeverityCellProps> = memo(({ score, isMultiBucketAnomaly }) => {
  const severity = getFormattedSeverityScore(score);
  const color = getSeverityColor(score);
  return isMultiBucketAnomaly ? (
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
