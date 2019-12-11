/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { get } from 'lodash';
import { EuiPage,
  EuiLink,
  EuiPageBody,
  EuiPageContent,
  EuiPanel,
  EuiSpacer,
  EuiScreenReaderOnly } from '@elastic/eui';
import { formatPercentageUsage, formatNumber } from '../../../lib/format_number';
import { ClusterStatus } from '..//cluster_status';
import { EuiMonitoringTable } from '../../table';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { LOGSTASH_SYSTEM_ID } from '../../../../common/constants';
import { SetupModeBadge } from '../../setup_mode/badge';
import { ListingCallOut } from '../../setup_mode/listing_callout';

export class Listing extends PureComponent {
  getColumns() {
    const { kbnUrl, scope } = this.props.angular;
    const setupMode = this.props.setupMode;

    return [
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.nameTitle', {
          defaultMessage: 'Name',
        }),
        field: 'name',
        sortable: true,
        render: (name, node) => {
          let setupModeStatus = null;
          if (setupMode && setupMode.enabled) {
            const list = get(setupMode, 'data.byUuid', {});
            const uuid = get(node, 'logstash.uuid');
            const status = list[uuid] || {};
            const instance = {
              uuid,
              name: node.name,
            };

            setupModeStatus = (
              <div className="monTableCell__setupModeStatus">
                <SetupModeBadge
                  setupMode={setupMode}
                  status={status}
                  instance={instance}
                  productName={LOGSTASH_SYSTEM_ID}
                />
              </div>
            );
          }

          return (
            <div>
              <div>
                <EuiLink
                  onClick={() => {
                    scope.$evalAsync(() => {
                      kbnUrl.changePath(`/logstash/node/${node.logstash.uuid}`);
                    });
                  }}
                >
                  {name}
                </EuiLink>
              </div>
              <div>{node.logstash.http_address}</div>
              {setupModeStatus}
            </div>
          );
        },
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.cpuUsageTitle', {
          defaultMessage: 'CPU Usage',
        }),
        field: 'cpu_usage',
        sortable: true,
        render: value => formatPercentageUsage(value, 100),
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.loadAverageTitle', {
          defaultMessage: 'Load Average',
        }),
        field: 'load_average',
        sortable: true,
        render: value => formatNumber(value, '0.00'),
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.jvmHeapUsedTitle', {
          defaultMessage: '{javaVirtualMachine} Heap Used',
          values: { javaVirtualMachine: 'JVM' },
        }),
        field: 'jvm_heap_used',
        sortable: true,
        render: value => formatPercentageUsage(value, 100),
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.eventsIngestedTitle', {
          defaultMessage: 'Events Ingested',
        }),
        field: 'events_out',
        sortable: true,
        render: value => formatNumber(value, '0.[0]a'),
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.configReloadsTitle', {
          defaultMessage: 'Config Reloads',
        }),
        sortable: true,
        render: node => (
          <div>
            <div>
              <FormattedMessage
                id="xpack.monitoring.logstash.nodes.configReloadsSuccessCountLabel"
                defaultMessage="{reloadsSuccesses} successes"
                values={{ reloadsSuccesses: node.reloads.successes }}
              />
            </div>
            <div>
              <FormattedMessage
                id="xpack.monitoring.logstash.nodes.configReloadsFailuresCountLabel"
                defaultMessage="{reloadsFailures} failures"
                values={{ reloadsFailures: node.reloads.failures }}
              />
            </div>
          </div>
        ),
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.versionTitle', {
          defaultMessage: 'Version',
        }),
        field: 'version',
        sortable: true,
        render: value => formatNumber(value),
      },
    ];
  }

  render() {
    const { stats, sorting, pagination, onTableChange, data, setupMode } = this.props;
    const columns = this.getColumns();
    const flattenedData = data.map(item => ({
      ...item,
      name: get(item, 'logstash.name', 'N/A'),
      cpu_usage: get(item, 'process.cpu.percent', 'N/A'),
      load_average: get(item, 'os.cpu.load_average.1m', 'N/A'),
      jvm_heap_used: get(item, 'jvm.mem.heap_used_percent', 'N/A'),
      events_out: get(item, 'events.out', 'N/A'),
      version: get(item, 'logstash.version', 'N/A'),
    }));

    let setupModeCallOut = null;
    if (setupMode.enabled && setupMode.data) {
      setupModeCallOut = (
        <ListingCallOut
          setupModeData={setupMode.data}
          useNodeIdentifier
          productName={LOGSTASH_SYSTEM_ID}
        />
      );
    }

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="xpack.monitoring.logstash.instances.heading"
                defaultMessage="Logstash instances"
              />
            </h1>
          </EuiScreenReaderOnly>
          <EuiPanel>
            <ClusterStatus stats={stats} />
          </EuiPanel>
          <EuiSpacer size="m" />
          {setupModeCallOut}
          <EuiPageContent>
            <EuiMonitoringTable
              className="logstashNodesTable"
              rows={flattenedData}
              setupMode={setupMode}
              productName={LOGSTASH_SYSTEM_ID}
              columns={columns}
              sorting={{
                ...sorting,
                sort: {
                  ...sorting.sort,
                  field: 'name',
                },
              }}
              pagination={pagination}
              search={{
                box: {
                  incremental: true,
                  placeholder: i18n.translate('xpack.monitoring.logstash.filterNodesPlaceholder', {
                    defaultMessage: 'Filter Nodes…',
                  }),
                },
              }}
              onTableChange={onTableChange}
              executeQueryOptions={{
                defaultFields: ['name'],
              }}
            />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
