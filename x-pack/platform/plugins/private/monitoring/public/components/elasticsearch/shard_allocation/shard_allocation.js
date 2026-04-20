/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiTitle,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  euiFontSize,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { ClusterView } from './components/cluster_view';

const clusterStyle = (theme) => css`
  table {
    width: 100%;
    max-width: 100%;
    margin-bottom: ${theme.euiTheme.size.l};
    border-collapse: collapse;
    font-size: ${euiFontSize(theme, 's').fontSize};
    line-height: ${euiFontSize(theme, 's').lineHeight};
  }

  thead {
    font-size: ${euiFontSize(theme, 'xs').fontSize};
  }

  th,
  td {
    border-top: ${theme.euiTheme.border.thin};
    padding: ${theme.euiTheme.size.xs};
    vertical-align: top;
  }

  th {
    text-align: left;
    border-bottom: ${theme.euiTheme.border.thin};
    vertical-align: bottom;
  }

  thead:first-child > tr:first-child > th {
    border-top: 0;
  }

  td:first-child {
    width: calc(${theme.euiTheme.base} * 12.5);
  }
`;

export const ShardAllocation = (props) => {
  const types = [
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.shardAllocation.primaryLabel', {
        defaultMessage: 'Primary',
      }),
      color: 'primary',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.shardAllocation.replicaLabel', {
        defaultMessage: 'Replica',
      }),
      color: 'success',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.shardAllocation.relocatingLabel', {
        defaultMessage: 'Relocating',
      }),
      color: 'accent',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.shardAllocation.initializingLabel', {
        defaultMessage: 'Initializing',
      }),
      color: 'default',
    },
    {
      label: i18n.translate(
        'xpack.monitoring.elasticsearch.shardAllocation.unassignedPrimaryLabel',
        {
          defaultMessage: 'Unassigned Primary',
        }
      ),
      color: 'danger',
    },
    {
      label: i18n.translate(
        'xpack.monitoring.elasticsearch.shardAllocation.unassignedReplicaLabel',
        {
          defaultMessage: 'Unassigned Replica',
        }
      ),
      color: 'warning',
    },
  ];

  return (
    <div css={clusterStyle}>
      <EuiTitle>
        <h1>
          <FormattedMessage
            id="xpack.monitoring.elasticsearch.shardAllocation.shardLegendTitle"
            defaultMessage="Shard Legend"
          />
        </h1>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiFlexGroup wrap responsive={false} gutterSize="s">
        {types.map((type) => (
          <EuiFlexItem grow={false} key={type.label}>
            <EuiBadge color={type.color}>{type.label}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ClusterView {...props} />
    </div>
  );
};
