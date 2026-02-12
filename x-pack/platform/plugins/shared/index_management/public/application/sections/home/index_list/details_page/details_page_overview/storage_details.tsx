/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTextColor,
  useEuiFontSize,
} from '@elastic/eui';

import { useAppContext } from '../../../../../app_context';
import type { Index } from '../../../../../../../common';
import { OverviewCard } from './overview_card';

export const StorageDetails: FunctionComponent<{
  primarySize: string;
  size: string;
  primary: Index['primary'];
  replica: Index['replica'];
}> = ({ primarySize, size, primary, replica }) => {
  const largeFontSize = useEuiFontSize('l').fontSize;
  const { config } = useAppContext();
  if (!config.enableIndexStats) {
    return null;
  }
  return (
    <OverviewCard
      data-test-subj="indexDetailsStorage"
      title={i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.storage.cardTitle', {
        defaultMessage: 'Storage',
      })}
      content={{
        left: (
          <EuiFlexGroup gutterSize="xs" alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiText
                css={css`
                  font-size: ${largeFontSize};
                `}
              >
                {primarySize}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTextColor color="subdued">
                {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.storage.primarySizeLabel', {
                  defaultMessage: 'Primary',
                })}
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        right: (
          <EuiFlexGroup gutterSize="xs" alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiText
                css={css`
                  font-size: ${largeFontSize};
                `}
              >
                {size}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTextColor color="subdued">
                {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.storage.totalSizeLabel', {
                  defaultMessage: 'Total',
                })}
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
      footer={{
        left: (
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiIcon type="shard" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTextColor color="subdued">
                {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.storage.shardsLabel', {
                  defaultMessage: 'Shards',
                })}
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        right: (
          <EuiTextColor color="subdued">
            {i18n.translate(
              'xpack.idxMgmt.indexDetails.overviewTab.storage.primariesReplicasLabel',
              {
                defaultMessage:
                  '{primary, plural, one {# Primary} other {# Primaries}} / {replica, plural, one {# Replica} other {# Replicas}} ',
                values: {
                  primary,
                  replica,
                },
              }
            )}
          </EuiTextColor>
        ),
      }}
    />
  );
};
