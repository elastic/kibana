/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { uniq, get } from 'lodash';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiLink, EuiScreenReaderOnly } from '@elastic/eui';
import { Stats } from 'plugins/monitoring/components/beats';
import { formatMetric } from 'plugins/monitoring/lib/format_number';
import { EuiMonitoringTable } from 'plugins/monitoring/components/table';
import { i18n } from '@kbn/i18n';
import { BEATS_SYSTEM_ID } from '../../../../common/constants';
import { ListingCallOut } from '../../setup_mode/listing_callout';
import { SetupModeBadge } from '../../setup_mode/badge';
import { FormattedMessage  } from '@kbn/i18n/react';

export class Listing extends PureComponent {
  getColumns() {
    const { kbnUrl, scope } = this.props.angular;
    const setupMode = this.props.setupMode;

    return [
      {
        name: i18n.translate('xpack.monitoring.beats.instances.nameTitle', {
          defaultMessage: 'Name',
        }),
        field: 'name',
        render: (name, beat) => {
          let setupModeStatus = null;
          if (setupMode && setupMode.enabled) {
            const list = get(setupMode, 'data.byUuid', {});
            const status = list[beat.uuid] || {};
            const instance = {
              uuid: beat.uuid,
              name: beat.name,
            };

            setupModeStatus = (
              <div className="monTableCell__setupModeStatus">
                <SetupModeBadge
                  setupMode={setupMode}
                  status={status}
                  instance={instance}
                  productName={BEATS_SYSTEM_ID}
                />
              </div>
            );
          }

          return (
            <div>
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
              {setupModeStatus}
            </div>
          );
        },
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.typeTitle', {
          defaultMessage: 'Type',
        }),
        field: 'type',
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.outputEnabledTitle', {
          defaultMessage: 'Output Enabled',
        }),
        field: 'output',
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.totalEventsRateTitle', {
          defaultMessage: 'Total Events Rate',
        }),
        field: 'total_events_rate',
        render: value => formatMetric(value, '', '/s'),
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.bytesSentRateTitle', {
          defaultMessage: 'Bytes Sent Rate',
        }),
        field: 'bytes_sent_rate',
        render: value => formatMetric(value, 'byte', '/s'),
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.outputErrorsTitle', {
          defaultMessage: 'Output Errors',
        }),
        field: 'errors',
        render: value => formatMetric(value, '0'),
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.allocatedMemoryTitle', {
          defaultMessage: 'Allocated Memory',
        }),
        field: 'memory',
        render: value => formatMetric(value, 'byte'),
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.versionTitle', {
          defaultMessage: 'Version',
        }),
        field: 'version',
      },
    ];
  }

  render() {
    const { stats, data, sorting, pagination, onTableChange, setupMode } = this.props;

    let setupModeCallOut = null;
    if (setupMode.enabled && setupMode.data) {
      setupModeCallOut = (
        <ListingCallOut
          setupModeData={setupMode.data}
          useNodeIdentifier={false}
          productName={BEATS_SYSTEM_ID}
        />
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
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="xpack.monitoring.beats.listing.heading"
                defaultMessage="Beats listing"
              />
            </h1>
          </EuiScreenReaderOnly>
          <EuiPageContent>
            <Stats stats={stats} />
            <EuiSpacer size="m" />
            {setupModeCallOut}
            <EuiMonitoringTable
              className="beatsTable"
              rows={data}
              setupMode={setupMode}
              productName={BEATS_SYSTEM_ID}
              columns={this.getColumns()}
              sorting={sorting}
              pagination={pagination}
              search={{
                box: {
                  incremental: true,
                  placeholder: i18n.translate('xpack.monitoring.beats.filterBeatsPlaceholder', {
                    defaultMessage: 'Filter Beats...',
                  }),
                },
                filters: [
                  {
                    type: 'field_value_selection',
                    field: 'type',
                    name: i18n.translate('xpack.monitoring.beats.instances.typeFilter', {
                      defaultMessage: 'Type',
                    }),
                    options: types,
                    multiSelect: 'or',
                  },
                  {
                    type: 'field_value_selection',
                    field: 'version',
                    name: i18n.translate('xpack.monitoring.beats.instances.versionFilter', {
                      defaultMessage: 'Version',
                    }),
                    options: versions,
                    multiSelect: 'or',
                  },
                ],
              }}
              onTableChange={onTableChange}
              executeQueryOptions={{
                defaultFields: ['name', 'type'],
              }}
            />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
