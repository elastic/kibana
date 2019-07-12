/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { uniq } from 'lodash';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiLink } from '@elastic/eui';
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
      onTableChange
    } = this.props;


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
            <EuiMonitoringTable
              className="beatsTable"
              rows={data}
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
