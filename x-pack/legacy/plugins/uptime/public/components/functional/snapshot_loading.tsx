/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore missing typings for EuiStat
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';

export const SnapshotLoading = () => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem grow={4}>
      <Fragment>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.uptime.snapshot.endpointStatusLoadingTitle"
              defaultMessage="Current status"
            />
          </h5>
        </EuiTitle>
        <EuiPanel paddingSize="s" style={{ height: 170 }}>
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
                    title="-"
                    titleColor="secondary"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    description={i18n.translate('xpack.uptime.snapshot.stats.downDescription', {
                      defaultMessage: 'Down',
                    })}
                    textAlign="center"
                    title="-"
                    titleColor="danger"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    description={i18n.translate('xpack.uptime.snapshot.stats.totalDescription', {
                      defaultMessage: 'Total',
                    })}
                    textAlign="center"
                    title="-"
                    titleColor="subdued"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </Fragment>
    </EuiFlexItem>
  </EuiFlexGroup>
);
