/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { get } from 'lodash';

import type { EuiDataGridColumn } from '@elastic/eui';
import { EuiPanel, EuiDescriptionList, EuiTitle } from '@elastic/eui';

import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { AlertsTableFlyoutBaseProps } from '@kbn/triggers-actions-ui-plugin/public';
import { isDefined } from '@kbn/ml-is-defined';

import type { RegisterFormatter } from './render_cell_value';

export const AlertFlyoutHeader: FC<AlertsTableFlyoutBaseProps> = ({ alert }) => {
  const name = alert[ALERT_RULE_NAME];
  return (
    <EuiTitle size="s">
      <h3>{name}</h3>
    </EuiTitle>
  );
};

export interface AlertFlyoutProps extends AlertsTableFlyoutBaseProps {
  columns: EuiDataGridColumn[];
  formatter: RegisterFormatter;
}

export const AlertFlyout: FC<AlertFlyoutProps> = ({ alert, columns, formatter }) => (
  <EuiPanel>
    <EuiDescriptionList
      listItems={columns.map((column) => {
        const alertFieldValue = get(alert, column.id);
        const value = (
          Array.isArray(alertFieldValue) ? alertFieldValue.at(-1) : alertFieldValue
        ) as string;

        return {
          title: column.displayAsText as string,
          description: isDefined(value) ? formatter(column.id, value) : '—',
        };
      })}
      type="column"
      columnWidths={[1, 3]} // Same as [25, 75]
    />
  </EuiPanel>
);
