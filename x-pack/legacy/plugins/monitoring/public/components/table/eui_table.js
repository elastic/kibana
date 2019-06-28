/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import {
  EuiInMemoryTable,
  EuiBadge,
  EuiButtonEmpty,
  EuiHealth
} from '@elastic/eui';
import { ELASTICSEARCH_CUSTOM_ID } from '../../../common/constants';
import { i18n } from '@kbn/i18n';

export class EuiMonitoringTable extends React.PureComponent {
  render() {
    const {
      rows: items,
      search = {},
      columns: _columns,
      setupMode,
      uuidField,
      nameField,
      ...props
    } = this.props;

    if (search.box && !search.box['data-test-subj']) {
      search.box['data-test-subj'] = 'monitoringTableToolBar';
    }

    if (search.box && !search.box.schema) {
      search.box.schema = true;
    }

    const columns = _columns.map(column => {
      if (!column['data-test-subj']) {
        column['data-test-subj'] = 'monitoringTableHasData';
      }

      if (!('sortable' in column)) {
        column.sortable = true;
      }
      return column;
    });

    if (setupMode && setupMode.enabled) {
      columns.push({
        name: i18n.translate('xpack.monitoring.euiTable.setupStatusTitle', {
          defaultMessage: 'Setup Status'
        }),
        field: uuidField,
        render: (uuid) => {
          const list = get(setupMode, 'data.byUuid', {});
          const status = list[uuid] || {};

          let statusBadge = null;
          if (status.isInternalCollector) {
            statusBadge = (
              <EuiHealth color="danger">
                {i18n.translate('xpack.monitoring.euiTable.isInternalCollectorLabel', {
                  defaultMessage: 'Internal collection'
                })}
              </EuiHealth>
            );
          }
          else if (status.isPartiallyMigrated) {
            statusBadge = (
              <EuiHealth color="warning">
                {i18n.translate('xpack.monitoring.euiTable.isPartiallyMigratedLabel', {
                  defaultMessage: 'Internal collection and Metricbeat collection'
                })}
              </EuiHealth>
            );
          }
          else if (status.isFullyMigrated) {
            statusBadge = (
              <EuiBadge color="primary">
                {i18n.translate('xpack.monitoring.euiTable.isFullyMigratedLabel', {
                  defaultMessage: 'Metricbeat collection'
                })}
              </EuiBadge>
            );
          }
          else {
            statusBadge = i18n.translate('xpack.monitoring.euiTable.migrationStatusUnknown', {
              defaultMessage: 'N/A'
            });
          }

          return statusBadge;
        }
      });

      columns.push({
        name: i18n.translate('xpack.monitoring.euiTable.setupActionTitle', {
          defaultMessage: 'Setup Action'
        }),
        field: uuidField,
        render: (uuid, product) => {
          const list = get(setupMode, 'data.byUuid', {});
          const status = list[uuid] || {};
          const instance = {
            uuid: get(product, uuidField),
            name: get(product, nameField),
          };

          // Migrating from partially to fully for Elasticsearch involves changing a cluster
          // setting which impacts all nodes in the cluster, which we have a separate callout
          // for. Since it does not make sense to do this on a per node basis, show nothing here
          if (status.isPartiallyMigrated && setupMode.productName === ELASTICSEARCH_CUSTOM_ID) {
            return null;
          }

          if (status.isInternalCollector || status.isPartiallyMigrated) {
            return (
              <EuiButtonEmpty flush="left" size="s" color="primary" onClick={() => setupMode.openFlyout(instance)}>
                {i18n.translate('xpack.monitoring.euiTable.migrateButtonLabel', {
                  defaultMessage: 'Migrate'
                })}
              </EuiButtonEmpty>
            );
          }

          return null;
        }
      });
    }

    return (
      <div data-test-subj={`${this.props.className}Container`}>
        <EuiInMemoryTable
          items={items}
          search={search}
          columns={columns}
          {...props}
        />
      </div>
    );
  }
}
