/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiBadgeGroup, EuiToolTip } from '@elastic/eui';
import { getEmptyCellValue } from '../empty_value';
import { metadataToPairs } from './observable_metadata_fields';

const lineClampedCss = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: normal;
`;

const badgeCss = css`
  max-width: 160px;
`;

/** The metadata of an observable value as `key: value` badges, clamped, with every pair on hover. */
export const ObservableMetadataBadges = ({ metadata }: { metadata?: Record<string, string> }) => {
  const pairs = metadataToPairs(metadata);

  if (pairs.length === 0) {
    return getEmptyCellValue();
  }

  const badges = (clamped: boolean) => (
    <EuiBadgeGroup gutterSize="xs" css={clamped ? lineClampedCss : undefined}>
      {pairs.map(({ key, value }) => (
        <EuiBadge
          key={key}
          color="hollow"
          css={clamped ? badgeCss : undefined}
          data-test-subj={`observable-metadata-badge-${key}`}
        >
          {`${key}: ${value}`}
        </EuiBadge>
      ))}
    </EuiBadgeGroup>
  );

  return (
    <EuiToolTip content={badges(false)} position="left">
      <span tabIndex={0}>{badges(true)}</span>
    </EuiToolTip>
  );
};

ObservableMetadataBadges.displayName = 'ObservableMetadataBadges';
