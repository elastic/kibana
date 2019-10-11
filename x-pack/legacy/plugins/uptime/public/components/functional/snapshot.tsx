/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiTitle } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { Snapshot as SnapshotType } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { snapshotQuery } from '../../queries';
import { SnapshotLoading } from './snapshot_loading';

interface SnapshotQueryResult {
  snapshot?: SnapshotType;
}

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 * @param props the props required by the component
 */
export const SnapshotComponent = ({ data }: UptimeGraphQLQueryProps<SnapshotQueryResult>) =>
  data && data.snapshot ? (
    <React.Fragment>
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.uptime.snapshot.endpointStatusTitle"
              defaultMessage="Current status"
            />
          </h5>
        </EuiTitle>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xs" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceEvenly" gutterSize="s">
              <EuiFlexItem>
                <EuiStat
                  description={i18n.translate('xpack.uptime.snapshot.stats.upDescription', {
                    defaultMessage: 'Up',
                  })}
                  textAlign="center"
                  title={data.snapshot.counts.up}
                  titleColor="secondary"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat
                  description={i18n.translate('xpack.uptime.snapshot.stats.downDescription', {
                    defaultMessage: 'Down',
                  })}
                  textAlign="center"
                  title={data.snapshot.counts.down}
                  titleColor="danger"
                />
              </EuiFlexItem>
              {data.snapshot.counts.mixed > 0 ? (
                <EuiFlexItem>
                  <EuiStat
                    description={i18n.translate('xpack.uptime.snapshot.stats.mixedDescription', {
                      defaultMessage: 'Mixed',
                    })}
                    textAlign="center"
                    title={data.snapshot.counts.mixed}
                    titleColor="subdued"
                  />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem>
                <EuiStat
                  description={i18n.translate('xpack.uptime.snapshot.stats.totalDescription', {
                    defaultMessage: 'Total',
                  })}
                  textAlign="center"
                  title={data.snapshot.counts.total}
                  titleColor="subdued"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </React.Fragment>
  ) : (
    <SnapshotLoading />
  );

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 */
export const Snapshot = withUptimeGraphQL<SnapshotQueryResult>(SnapshotComponent, snapshotQuery);
