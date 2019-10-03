/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiInMemoryTable,
  EuiButton,
  EuiSpacer
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIdentifier } from '../setup_mode/formatting';

export class EuiMonitoringTable extends React.PureComponent {
  render() {
    const {
      rows: items,
      search = {},
      columns: _columns,
      setupMode,
      productName,
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

    let footerContent = null;
    if (setupMode && setupMode.enabled) {
      footerContent = (
        <Fragment>
          <EuiSpacer size="m"/>
          <EuiButton iconType="flag" onClick={() => setupMode.openFlyout({}, true)}>
            {i18n.translate('xpack.monitoring.euiTable.setupNewButtonLabel', {
              defaultMessage: 'Set up monitoring for new {identifier}',
              values: {
                identifier: getIdentifier(productName)
              }
            })}
          </EuiButton>
        </Fragment>
      );
    }

    return (
      <div data-test-subj={`${this.props.className}Container`}>
        <EuiInMemoryTable
          items={items}
          search={search}
          columns={columns}
          {...props}
        />
        {footerContent}
      </div>
    );
  }
}
