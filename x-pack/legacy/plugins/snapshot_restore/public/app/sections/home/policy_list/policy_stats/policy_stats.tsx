/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiTitle } from '@elastic/eui';

import { SlmPolicyStats } from '../../../../../../common/types';
import { useAppDependencies } from '../../../../index';

interface Props {
  stats: SlmPolicyStats;
}

export const PolicyStats: React.FunctionComponent<Props> = ({ stats }) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const {
    retentionRuns,
    retentionFailed,
    retentionTimedOut,
    retentionDeletionTime,
    totalSnapshotsTaken,
    totalSnapshotsFailed,
    totalSnapshotsDeleted,
    totalSnapshotDeletionFailures,
  } = stats;

  const { FormattedMessage } = i18n;

  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          {/* Retention stats */}
          <EuiPanel>
            <EuiTitle size="xs">
              <h4>
                <FormattedMessage
                  id="xpack.snapshotRestore.policyStats.retentionStatsTitle"
                  defaultMessage="Retention stats"
                />
              </h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={retentionRuns}
                  description={i18n.translate('xpack.snapshotRestore.policyStats.retentionRuns', {
                    defaultMessage: 'Runs',
                  })}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={retentionFailed}
                  description={i18n.translate('xpack.snapshotRestore.policyStats.retentionFailed', {
                    defaultMessage: 'Failures',
                  })}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={retentionTimedOut}
                  description={i18n.translate(
                    'xpack.snapshotRestore.policyStats.retentionTimedOut',
                    {
                      defaultMessage: 'Timed out',
                    }
                  )}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={retentionDeletionTime}
                  description={i18n.translate(
                    'xpack.snapshotRestore.policyStats.retentionDeletionTime',
                    {
                      defaultMessage: 'Deletion time',
                    }
                  )}
                  titleSize="s"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>

        {/* Snapshot stats */}
        <EuiFlexItem>
          <EuiPanel>
            <EuiTitle size="xs">
              <h4>
                <FormattedMessage
                  id="xpack.snapshotRestore.policyStats.snapshotStatsTitle"
                  defaultMessage="Snapshot stats"
                />
              </h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={totalSnapshotsTaken}
                  description={i18n.translate(
                    'xpack.snapshotRestore.policyStats.totalSnapshotsTaken',
                    {
                      defaultMessage: 'Snapshots',
                    }
                  )}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={totalSnapshotsFailed}
                  description={i18n.translate(
                    'xpack.snapshotRestore.policyStats.totalSnapshotsFailed',
                    {
                      defaultMessage: 'Failures',
                    }
                  )}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={totalSnapshotsDeleted}
                  description={i18n.translate(
                    'xpack.snapshotRestore.policyStats.totalSnapshotsDeleted',
                    {
                      defaultMessage: 'Deletions',
                    }
                  )}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={totalSnapshotDeletionFailures}
                  description={i18n.translate(
                    'xpack.snapshotRestore.policyStats.totalSnapshotsDeletionFailures',
                    {
                      defaultMessage: 'Deletion failures',
                    }
                  )}
                  titleSize="s"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />
    </Fragment>
  );
};
