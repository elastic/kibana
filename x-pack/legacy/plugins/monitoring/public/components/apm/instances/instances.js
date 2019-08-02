/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import moment from 'moment';
import { uniq, get } from 'lodash';
import { EuiMonitoringTable } from '../../table';
import { EuiLink, EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { Status } from './status';
import { formatMetric } from '../../../lib/format_number';
import { formatTimestampToDuration } from '../../../../common';
import { i18n } from '@kbn/i18n';

const columns = [
  {
    name: i18n.translate('xpack.monitoring.apm.instances.nameTitle', {
      defaultMessage: 'Name'
    }),
    field: 'name',
    render: (name, instance) => (
      <EuiLink
        href={`#/apm/instances/${instance.uuid}`}
        data-test-subj={`apmLink-${name}`}
      >
        {name}
      </EuiLink>
    )
  },
  {
    name: i18n.translate('xpack.monitoring.apm.instances.outputEnabledTitle', {
      defaultMessage: 'Output Enabled'
    }),
    field: 'output'
  },
  {
    name: i18n.translate('xpack.monitoring.apm.instances.totalEventsRateTitle', {
      defaultMessage: 'Total Events Rate'
    }),
    field: 'total_events_rate',
    render: value => formatMetric(value, '', '/s')
  },
  {
    name: i18n.translate('xpack.monitoring.apm.instances.bytesSentRateTitle', {
      defaultMessage: 'Bytes Sent Rate'
    }),
    field: 'bytes_sent_rate',
    render: value => formatMetric(value, 'byte', '/s')
  },
  {
    name: i18n.translate('xpack.monitoring.apm.instances.outputErrorsTitle', {
      defaultMessage: 'Output Errors'
    }),
    field: 'errors',
    render: value => formatMetric(value, '0')
  },
  {
    name: i18n.translate('xpack.monitoring.apm.instances.lastEventTitle', {
      defaultMessage: 'Last Event'
    }),
    field: 'time_of_last_event',
    render: value => i18n.translate('xpack.monitoring.apm.instances.lastEventValue', {
      defaultMessage: '{timeOfLastEvent} ago',
      values: {
        timeOfLastEvent: formatTimestampToDuration(+moment(value), 'since')
      }
    })
  },
  {
    name: i18n.translate('xpack.monitoring.apm.instances.allocatedMemoryTitle', {
      defaultMessage: 'Allocated Memory'
    }),
    field: 'memory',
    render: value => formatMetric(value, 'byte')
  },
  {
    name: i18n.translate('xpack.monitoring.apm.instances.versionTitle', {
      defaultMessage: 'Version'
    }),
    field: 'version'
  },
];

export function ApmServerInstances({ apms, setupMode }) {
  const {
    pagination,
    sorting,
    onTableChange,
    data,
  } = apms;

  let detectedInstanceMessage = null;
  if (setupMode.enabled && setupMode.data && get(setupMode.data, 'detected.mightExist')) {
    detectedInstanceMessage = (
      <Fragment>
        <EuiCallOut
          title={i18n.translate('xpack.monitoring.apm.instances.metricbeatMigration.detectedInstanceTitle', {
            defaultMessage: 'APM server detected',
          })}
          color="warning"
          iconType="help"
        >
          <p>
            {i18n.translate('xpack.monitoring.apm.instances.metricbeatMigration.detectedInstanceDescription', {
              defaultMessage: `Based on your indices, we think you might have an APM server. Click the 'Setup monitoring'
              button below to start monitoring this APM server.`
            })}
          </p>
        </EuiCallOut>
        <EuiSpacer size="m"/>
      </Fragment>
    );
  }

  const versions = uniq(data.apms.map(item => item.version)).map(version => {
    return { value: version };
  });

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <Status stats={data.stats} />
          <EuiSpacer size="m"/>
          {detectedInstanceMessage}
          <EuiMonitoringTable
            className="apmInstancesTable"
            rows={data.apms}
            columns={columns}
            sorting={sorting}
            pagination={pagination}
            setupMode={setupMode}
            uuidField="uuid"
            nameField="name"
            setupNewButtonLabel={i18n.translate('xpack.monitoring.apm.metricbeatMigration.setupNewButtonLabel', {
              defaultMessage: 'Setup monitoring for new APM server'
            })}
            search={{
              box: {
                incremental: true,
                placeholder: i18n.translate('xpack.monitoring.apm.instances.filterInstancesPlaceholder', {
                  defaultMessage: 'Filter Instances…'
                })
              },
              filters: [
                {
                  type: 'field_value_selection',
                  field: 'version',
                  name: i18n.translate('xpack.monitoring.apm.instances.versionFilter', {
                    defaultMessage: 'Version'
                  }),
                  options: versions,
                  multiSelect: 'or',
                }
              ]
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
