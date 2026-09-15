/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import type { TableHTMLAttributes } from 'react';
import React from 'react';
import type { EuiTableProps } from '@elastic/eui';
import { EuiTable, EuiTableBody, EuiTableRow, EuiTableRowCell } from '@elastic/eui';
import { FormattedValue } from './formatted_value';
import type { RenderKeyValue } from './formatted_value';
import type { KeyValuePair } from './utils/get_flattened_key_value_pairs';

// Consumers render one table per section (see APM's metadata tab), and CSS column widths
// are never shared between sibling tables. Combined with `tableLayout: 'fixed'`, an explicit
// key-column width keeps the value column at the same x-position in every table, independently
// of how long the longest key in any given section happens to be. `em` rather than a
// percentage because EUI warns against relative units for cell widths, and because it keeps
// the column readable at high zoom instead of scaling with the container.
const KEY_COLUMN_WIDTH = '24em';

export function KeyValueTable({
  keyValuePairs,
  tableProps = {},
  dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS',
  dateTimezone = 'Browser',
  renderValue,
}: {
  keyValuePairs: KeyValuePair[];
  tableProps?: EuiTableProps & TableHTMLAttributes<HTMLTableElement>;
  dateFormat?: string;
  dateTimezone?: string;
  renderValue?: RenderKeyValue;
}) {
  return (
    <EuiTable compressed tableLayout="fixed" {...tableProps}>
      <EuiTableBody>
        {keyValuePairs.map(({ key, value }) => {
          const asArray = castArray(value);
          const valueList =
            asArray.length <= 1 ? (
              <FormattedValue
                value={asArray[0]}
                dateFormat={dateFormat}
                dateTimezone={dateTimezone}
                fieldKey={key}
                renderValue={renderValue}
              />
            ) : (
              <ul>
                {asArray.map((val, index) => (
                  <li key={index}>
                    <FormattedValue
                      value={val}
                      dateFormat={dateFormat}
                      dateTimezone={dateTimezone}
                      fieldKey={key}
                      renderValue={renderValue}
                    />
                  </li>
                ))}
              </ul>
            );

          return (
            <EuiTableRow key={key}>
              <EuiTableRowCell width={KEY_COLUMN_WIDTH}>
                <strong data-test-subj="dot-key">{key}</strong>
              </EuiTableRowCell>
              <EuiTableRowCell data-test-subj="value">{valueList}</EuiTableRowCell>
            </EuiTableRow>
          );
        })}
      </EuiTableBody>
    </EuiTable>
  );
}
