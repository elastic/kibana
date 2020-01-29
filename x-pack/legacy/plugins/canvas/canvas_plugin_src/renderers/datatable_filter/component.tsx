/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';
import { Datatable } from '../../../types';

export interface Props {
  datatable: Datatable;
  values?: EuiComboBoxOptionProps[];
  onChange: (values: EuiComboBoxOptionProps[]) => void;
}

export const MultiFilter: FC<Props> = ({ datatable, values = [], onChange }) => {
  const [selectedValues, setSelectedValues] = useState(values);

  const onChangeHandler = (filterValues: EuiComboBoxOptionProps[]) => {
    setSelectedValues(filterValues);
  };

  // Create a collection of groupings of options
  const groupings: { [key: string]: string[] } = {};

  // Create object keys for each column in the datatable
  const groups = datatable.columns.map(column => column.name);
  groups.forEach(group => (groupings[group] = []));

  // For each row, add a unique entry for the grouping
  datatable.rows.forEach(row =>
    datatable.columns.forEach(column => {
      const g = groupings[column.name];
      const r = row[column.name];
      if (g.indexOf(r) < 0) {
        g.push(r);
      }
    })
  );

  // Create the appropriately-shaped choices for the drop down.
  const choices: EuiComboBoxOptionProps[] = Object.keys(groupings).map(key => ({
    label: key,
    options: groupings[key].map(value => ({ value: key + ':' + value, label: key + ':' + value })),
  }));

  return (
    <div className="">
      <EuiComboBox
        options={choices}
        selectedOptions={selectedValues}
        onChange={onChangeHandler}
        onBlur={() => {
          onChange(selectedValues);
        }}
      />
    </div>
  );
};
