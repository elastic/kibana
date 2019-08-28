/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPanel,
  EuiSpacer,
  EuiLink,
  EuiCallOut,
} from '@elastic/eui';
import { capitalize, get } from 'lodash';
import { ClusterStatus } from '../cluster_status';
import { EuiMonitoringTable } from '../../table';
import { KibanaStatusIcon } from '../status_icon';
import { StatusIcon } from 'plugins/monitoring/components/status_icon';
import { formatMetric, formatNumber } from '../../../lib/format_number';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const getColumns = (kbnUrl, scope, setupMode) => {
  const columns = [
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.nameColumnTitle', {
        defaultMessage: 'Name'
      }),
      field: 'name',
      render: (name, kibana) => {
        if (setupMode && setupMode.enabled) {
          const list = get(setupMode, 'data.byUuid', {});
          const status = list[get(kibana, 'kibana.uuid')] || {};
          if (status.isNetNewUser) {
            return name;
          }
        }

        return (
          <EuiLink
            onClick={() => {
              scope.$evalAsync(() => {
                kbnUrl.changePath(`/kibana/instances/${kibana.kibana.uuid}`);
              });
            }}
            data-test-subj={`kibanaLink-${name}`}
          >
            { name }
          </EuiLink>
        );
      }
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.statusColumnTitle', {
        defaultMessage: 'Status'
      }),
      field: 'status',
      render: (status, kibana) => (
        <div
          title={
            i18n.translate('xpack.monitoring.kibana.listing.instanceStatusTitle', {
              defaultMessage: 'Instance status: {kibanaStatus}',
              values: {
                kibanaStatus: status
              }
            })
          }
          className="monTableCell__status"
        >
          <KibanaStatusIcon status={status} availability={kibana.availability} />&nbsp;
          { !kibana.availability ? (
            <FormattedMessage
              id="xpack.monitoring.kibana.listing.instanceStatus.offlineLabel"
              defaultMessage="Offline"
            />
          ) : capitalize(status) }
        </div>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.loadAverageColumnTitle', {
        defaultMessage: 'Load Average'
      }),
      field: 'os.load.1m',
      render: value => (
        <span>
          {formatMetric(value, '0.00')}
        </span>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.memorySizeColumnTitle', {
        defaultMessage: 'Memory Size'
      }),
      field: 'process.memory.resident_set_size_in_bytes',
      render: value => (
        <span>
          {formatNumber(value, 'byte')}
        </span>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.requestsColumnTitle', {
        defaultMessage: 'Requests'
      }),
      field: 'requests.total',
      render: value => (
        <span>
          {formatNumber(value, 'int_commas')}
        </span>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.responseTimeColumnTitle', {
        defaultMessage: 'Response Times'
      }),
      // It is possible this does not exist through MB collection
      field: 'response_times.average',
      render: (value, kibana) => {
        if (!value) {
          return null;
        }

        return (
          <div>
            <div className="monTableCell__splitNumber">
              { (formatNumber(value, 'int_commas') + ' ms avg') }
            </div>
            <div className="monTableCell__splitNumber">
              { formatNumber(kibana.response_times.max, 'int_commas') } ms max
            </div>
          </div>
        );
      }
    }
  ];

  return columns;
};

export class KibanaInstances extends PureComponent {
  render() {
    const {
      clusterStatus,
      angular,
      setupMode,
      sorting,
      pagination,
      onTableChange
    } = this.props;

    let netNewUserMessage = null;
    // Merge the instances data with the setup data if enabled
    const instances = this.props.instances || [];
    if (setupMode.enabled && setupMode.data) {
      // We want to create a seamless experience for the user by merging in the setup data
      // and the node data from monitoring indices in the likely scenario where some instances
      // are using MB collection and some are using no collection
      const instancesByUuid = instances.reduce((byUuid, instance) => ({
        ...byUuid,
        [get(instance, 'kibana.uuid')]: instance
      }), {});

      instances.push(...Object.entries(setupMode.data.byUuid)
        .reduce((instances, [nodeUuid, instance]) => {
          if (!instancesByUuid[nodeUuid]) {
            instances.push({
              kibana: {
                ...instance.instance.kibana,
                status: StatusIcon.TYPES.GRAY
              }
            });
          }
          return instances;
        }, []));

      const hasInstances = setupMode.data.totalUniqueInstanceCount > 0;
      if (!hasInstances) {
        netNewUserMessage = (
          <Fragment>
            <EuiCallOut
              title={i18n.translate('xpack.monitoring.kibana.nodes.metribeatMigration.netNewUserTitle', {
                defaultMessage: 'No monitoring data detected',
              })}
              color="danger"
              iconType="cross"
            >
              <p>
                {i18n.translate('xpack.monitoring.kibana.nodes.metribeatMigration.netNewUserDescription', {
                  defaultMessage: `We did not detect any monitoring data, but we did detect the following Kibana instance.
                  This detected instance is listed below along with a Setup button. Clicking this button will guide you through
                  the process of enabling monitoring for this instance.`
                })}
              </p>
            </EuiCallOut>
            <EuiSpacer size="m"/>
          </Fragment>
        );
      }
    }

    const dataFlattened = instances.map(item => ({
      ...item,
      name: item.kibana.name,
      status: item.kibana.status,
    }));


    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPanel>
            <ClusterStatus stats={clusterStatus} />
          </EuiPanel>
          <EuiSpacer size="m" />
          {netNewUserMessage}
          <EuiPageContent>
            <EuiMonitoringTable
              className="kibanaInstancesTable"
              rows={dataFlattened}
              columns={getColumns(angular.kbnUrl, angular.$scope, setupMode)}
              sorting={sorting}
              pagination={pagination}
              setupMode={setupMode}
              uuidField="kibana.uuid"
              nameField="name"
              setupNewButtonLabel={i18n.translate('xpack.monitoring.kibana.metricbeatMigration.setupNewButtonLabel', {
                defaultMessage: 'Setup monitoring for new Kibana instance'
              })}
              search={{
                box: {
                  incremental: true,
                  placeholder: i18n.translate('xpack.monitoring.kibana.listing.filterInstancesPlaceholder', {
                    defaultMessage: 'Filter Instances…'
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
