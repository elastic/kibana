/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiTitle,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { Snapshot as SnapshotType } from '../../../common/graphql/types';
import { UptimeAppColors } from '../../uptime_app';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { snapshotQuery } from '../../queries';
import { SnapshotHistogram } from './charts';
import { SnapshotLoading } from './snapshot_loading';

interface SnapshotQueryResult {
  snapshot?: SnapshotType;
}

interface SnapshotProps {
  /**
   * The date/time for the start of the timespan.
   */
  absoluteStartDate: number;
  /**
   * The date/time for the end of the timespan.
   */
  absoluteEndDate: number;
  /**
   * Valid colors to be used by the component and its children.
   */
  colors: UptimeAppColors;
}

type Props = UptimeGraphQLQueryProps<SnapshotQueryResult> & SnapshotProps;

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 * @param props the props required by the component
 */
export const SnapshotComponent = ({
  absoluteStartDate,
  absoluteEndDate,
  colors: { danger, success },
  data,
}: Props) =>
  data && data.snapshot ? (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={4}>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.uptime.snapshot.endpointStatusTitle"
              defaultMessage="Current status"
            />
          </h5>
        </EuiTitle>
        <EuiPanel paddingSize="s">
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="spaceEvenly" gutterSize="s">
                <EuiFlexItem>
                  <EuiStat
                    description={i18n.translate('xpack.uptime.snapshot.stats.upDescription', {
                      defaultMessage: 'Up',
                    })}
                    textAlign="center"
                    title={data.snapshot.up}
                    titleColor="secondary"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    description={i18n.translate('xpack.uptime.snapshot.stats.downDescription', {
                      defaultMessage: 'Down',
                    })}
                    textAlign="center"
                    title={data.snapshot.down}
                    titleColor="danger"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    description={i18n.translate('xpack.uptime.snapshot.stats.totalDescription', {
                      defaultMessage: 'Total',
                    })}
                    textAlign="center"
                    title={data.snapshot.total}
                    titleColor="subdued"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={8}>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.uptime.snapshot.statusOverTimeTitle"
              defaultMessage="Status over time"
            />
          </h5>
        </EuiTitle>
        <EuiPanel paddingSize="s" style={{ height: 170 }}>
          {data.snapshot.histogram && (
            <SnapshotHistogram
              absoluteStartDate={absoluteStartDate}
              absoluteEndDate={absoluteEndDate}
              dangerColor={danger}
              histogram={data.snapshot.histogram}
              successColor={success}
            />
          )}
          {!data.snapshot.histogram && (
            <EuiEmptyPrompt
              title={
                <EuiTitle>
                  <h5>
                    <FormattedMessage
                      id="xpack.uptime.snapshot.noDataTitle"
                      defaultMessage="No histogram data available"
                    />
                  </h5>
                </EuiTitle>
              }
              body={
                <p>
                  <FormattedMessage
                    id="xpack.uptime.snapshot.noDataDescription"
                    defaultMessage="Sorry, there is no data available for the histogram"
                  />
                </p>
              }
            />
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <SnapshotLoading />
  );

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 */
export const Snapshot = withUptimeGraphQL<SnapshotQueryResult, SnapshotProps>(
  SnapshotComponent,
  snapshotQuery
);
