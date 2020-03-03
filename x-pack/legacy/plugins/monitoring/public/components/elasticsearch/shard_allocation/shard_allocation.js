/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiTitle, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { ClusterView } from './components/cluster_view';

export const ShardAllocation = ({ scope, kbnUrl, type, shardStats }) => {
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
      color: 'secondary',
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
    <div className="monCluster">
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
        {types.map(type => (
          <EuiFlexItem grow={false} key={type.label}>
            <EuiBadge color={type.color}>{type.label}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ClusterView
        scope={scope}
        shardStats={shardStats}
        kbnUrl={kbnUrl}
        showSystemIndices={scope.showSystemIndices}
        toggleShowSystemIndices={scope.toggleShowSystemIndices}
        type={type}
      />
    </div>
  );
};
