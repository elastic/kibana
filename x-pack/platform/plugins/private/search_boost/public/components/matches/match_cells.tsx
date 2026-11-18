/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiProgress,
  useEuiTheme,
} from '@elastic/eui';
import type { DataRetention } from '../../../common/types';
import type { LinkProps } from '../../types';
import { formatStorageSize } from '../format';
import {
  KEEP_INDEFINITELY,
  OUTRANKED_BY_COLUMN,
  OUTRANKED_BY_TOOLTIP,
  RETENTION_DISABLED,
} from '../../translations';

export const OutrankedByHeader = () => (
  <EuiFlexGroup component="span" gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem component="span" grow={false}>
      {OUTRANKED_BY_COLUMN}
    </EuiFlexItem>
    <EuiFlexItem component="span" grow={false}>
      <EuiIconTip
        type="info"
        size="s"
        content={OUTRANKED_BY_TOOLTIP}
        aria-label={OUTRANKED_BY_TOOLTIP}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface OutrankedByProps {
  ruleName?: string;
  getRuleLinkProps: (ruleName: string) => LinkProps;
}

export const OutrankedBy = ({ ruleName, getRuleLinkProps }: OutrankedByProps) =>
  ruleName ? (
    <EuiLink {...getRuleLinkProps(ruleName)} data-test-subj="searchBoostOutrankedByLink">
      {ruleName}
    </EuiLink>
  ) : (
    <>—</>
  );

export const RetentionValue = ({ retention }: { retention?: DataRetention }) => {
  switch (retention?.type) {
    case 'value':
      return <>{retention.value}</>;
    case 'disabled':
      return <>{RETENTION_DISABLED}</>;
    case 'infinite':
      return (
        <EuiIconTip type="infinity" content={KEEP_INDEFINITELY} aria-label={KEEP_INDEFINITELY} />
      );
    default:
      return null;
  }
};

interface StorageSizeProps {
  bytes: number;
  largestBytes: number;
  showsBar: boolean;
  isOutranked: boolean;
}

export const StorageSize = ({ bytes, largestBytes, showsBar, isOutranked }: StorageSizeProps) => {
  const { euiTheme } = useEuiTheme();
  return showsBar ? (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false} css={{ minWidth: '5em' }}>
        {formatStorageSize(bytes)}
      </EuiFlexItem>
      <EuiFlexItem aria-hidden>
        <EuiProgress
          value={bytes}
          max={largestBytes || 1}
          size="s"
          color={isOutranked ? euiTheme.colors.textDisabled : 'primary'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <>{formatStorageSize(bytes)}</>
  );
};
