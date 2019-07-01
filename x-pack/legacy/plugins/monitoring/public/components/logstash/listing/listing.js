/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { get } from 'lodash';
import { EuiPage, EuiLink, EuiPageBody, EuiPageContent, EuiPanel, EuiSpacer } from '@elastic/eui';
import { formatPercentageUsage, formatNumber } from '../../../lib/format_number';
import { ClusterStatus } from '..//cluster_status';
import { EuiMonitoringTable } from '../../table';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

export class Listing extends PureComponent {
  getColumns() {
    const { kbnUrl, scope } = this.props.angular;

    return [
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.nameTitle', {
          defaultMessage: 'Name'
        }),
        field: 'name',
        sortable: true,
        render: (name, node) => (
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
            <div>
              {node.logstash.http_address}
            </div>
          </div>
        )
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.cpuUsageTitle', {
          defaultMessage: 'CPU Usage'
        }),
        field: 'cpu_usage',
        sortable: true,
        render: value => formatPercentageUsage(value, 100)
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.loadAverageTitle', {
          defaultMessage: 'Load Average'
        }),
        field: 'load_average',
        sortable: true,
        render: value => formatNumber(value, '0.00')
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.jvmHeapUsedTitle', {
          defaultMessage: '{javaVirtualMachine} Heap Used',
          values: { javaVirtualMachine: 'JVM' }
        }),
        field: 'jvm_heap_used',
        sortable: true,
        render: value => formatPercentageUsage(value, 100)
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.eventsIngestedTitle', {
          defaultMessage: 'Events Ingested'
        }),
        field: 'events_out',
        sortable: true,
        render: value => formatNumber(value, '0.[0]a')
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.configReloadsTitle', {
          defaultMessage: 'Config Reloads'
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
        )
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.versionTitle', {
          defaultMessage: 'Version'
        }),
        field: 'version',
        sortable: true,
        render: value => formatNumber(value)
      }
    ];
  }
  render() {
    const { data, stats, sorting, pagination, onTableChange } = this.props;
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

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPanel>
            <ClusterStatus stats={stats} />
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiPageContent>
            <EuiMonitoringTable
              className="logstashNodesTable"
              rows={flattenedData}
              columns={columns}
              sorting={{
                ...sorting,
                sort: {
                  ...sorting.sort,
                  field: 'name'
                }
              }}
              pagination={pagination}
              search={{
                box: {
                  incremental: true,
                  placeholder: i18n.translate('xpack.monitoring.logstash.filterNodesPlaceholder', {
                    defaultMessage: 'Filter Nodes…'
                  })
                },
              }}
              onTableChange={onTableChange}
              executeQueryOptions={{
                defaultFields: ['name']
              }}
            />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
