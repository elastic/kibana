/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import { uniq, get } from 'lodash';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiLink, EuiCallOut } from '@elastic/eui';
import { Stats } from 'plugins/monitoring/components/beats';
import { formatMetric } from 'plugins/monitoring/lib/format_number';
import { EuiMonitoringTable } from 'plugins/monitoring/components/table';
import { i18n } from '@kbn/i18n';

export class Listing extends PureComponent {
  getColumns() {
    const { kbnUrl, scope } = this.props.angular;

    return [
      {
        name: i18n.translate('xpack.monitoring.beats.instances.nameTitle', { defaultMessage: 'Name' }),
        field: 'name',
        render: (name, beat) => (
          <EuiLink
            onClick={() => {
              scope.$evalAsync(() => {
                kbnUrl.changePath(`/beats/beat/${beat.uuid}`);
              });
            }}
            data-test-subj={`beatLink-${name}`}
          >
            {name}
          </EuiLink>
        )
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.typeTitle', { defaultMessage: 'Type' }),
        field: 'type',
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.outputEnabledTitle', { defaultMessage: 'Output Enabled' }),
        field: 'output'
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.totalEventsRateTitle', { defaultMessage: 'Total Events Rate' }),
        field: 'total_events_rate',
        render: value => formatMetric(value, '', '/s')
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.bytesSentRateTitle', { defaultMessage: 'Bytes Sent Rate' }),
        field: 'bytes_sent_rate',
        render: value => formatMetric(value, 'byte', '/s')
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.outputErrorsTitle', { defaultMessage: 'Output Errors' }),
        field: 'errors',
        render: value => formatMetric(value, '0')
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.allocatedMemoryTitle', { defaultMessage: 'Allocated Memory' }),
        field: 'memory',
        render: value => formatMetric(value, 'byte')
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.versionTitle', { defaultMessage: 'Version' }),
        field: 'version',
      },
    ];
  }

  render() {
    const {
      stats,
      data,
      sorting,
      pagination,
      onTableChange,
      setupMode
    } = this.props;

    let detectedInstanceMessage = null;
    if (setupMode.enabled && setupMode.data && get(setupMode.data, 'detected.mightExist')) {
      detectedInstanceMessage = (
        <Fragment>
          <EuiCallOut
            title={i18n.translate('xpack.monitoring.beats.instances.metricbeatMigration.detectedInstanceTitle', {
              defaultMessage: 'Beats instance detected',
            })}
            color="warning"
            iconType="help"
          >
            <p>
              {i18n.translate('xpack.monitoring.beats.instances.metricbeatMigration.detectedInstanceDescription', {
                defaultMessage: `Based on your indices, we think you might have a beats instance. Click the 'Setup monitoring'
                button below to start monitoring this instance.`
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m"/>
        </Fragment>
      );
    }

    const types = uniq(data.map(item => item.type)).map(type => {
      return { value: type };
    });

    const versions = uniq(data.map(item => item.version)).map(version => {
      return { value: version };
    });

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <Stats stats={stats} />
            <EuiSpacer size="m"/>
            {detectedInstanceMessage}
            <EuiMonitoringTable
              className="beatsTable"
              rows={data}
              setupMode={setupMode}
              uuidField="uuid"
              nameField="name"
              setupNewButtonLabel={i18n.translate('xpack.monitoring.beats.metricbeatMigration.setupNewButtonLabel', {
                defaultMessage: 'Setup monitoring for new Beats instance'
              })}
              columns={this.getColumns()}
              sorting={sorting}
              pagination={pagination}
              search={{
                box: {
                  incremental: true,
                  placeholder: i18n.translate('xpack.monitoring.beats.filterBeatsPlaceholder', { defaultMessage: 'Filter Beats...' }),
                },
                filters: [
                  {
                    type: 'field_value_selection',
                    field: 'type',
                    name: i18n.translate('xpack.monitoring.beats.instances.typeFilter', {
                      defaultMessage: 'Type'
                    }),
                    options: types,
                    multiSelect: 'or',
                  },
                  {
                    type: 'field_value_selection',
                    field: 'version',
                    name: i18n.translate('xpack.monitoring.beats.instances.versionFilter', {
                      defaultMessage: 'Version'
                    }),
                    options: versions,
                    multiSelect: 'or',
                  }
                ]
              }}
              onTableChange={onTableChange}
              executeQueryOptions={{
                defaultFields: ['name', 'type']
              }}
            />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
