/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';
import { Datatable } from '../../../types';

export interface MultiFilterValue {
  column: string;
  value: string;
}

export interface Props {
  datatable: Datatable;
  columns?: string[];
  selected?: MultiFilterValue[];
  onChange: (values: MultiFilterValue[]) => void;
}

export const MultiFilter: FC<Props> = ({
  datatable,
  columns = datatable.columns.map(column => column.name),
  selected = [],
  onChange,
}) => {
  const toOption = (value: MultiFilterValue): EuiComboBoxOptionProps<MultiFilterValue> => ({
    label: value.column + ':' + value.value,
    value,
  });

  const [selectedOptions, setSelectedOptions] = useState(selected.map(toOption));

  // Create a collection of groupings of options
  const groupings: { [key: string]: MultiFilterValue[] } = columns.reduce<{
    [key: string]: MultiFilterValue[];
  }>((acc, column) => {
    const objs = datatable.rows.map(row => ({ column, value: row[column] }));
    acc[column] = Array.from(new Set(objs.map(item => item.value))).map(
      value => objs.find(item => item.value === value) as MultiFilterValue
    );
    return acc;
  }, {});

  // Create the appropriately-shaped choices for the drop down.
  const options: Array<EuiComboBoxOptionProps<MultiFilterValue>> = Object.keys(groupings).map(
    group => ({
      label: group,
      options: groupings[group].map(item => toOption({ column: group, value: item.value })),
    })
  );

  const onChangeHandler = (items: Array<EuiComboBoxOptionProps<MultiFilterValue>>) => {
    setSelectedOptions(items);
  };

  return (
    <div className="">
      <EuiComboBox
        placeholder="Select filters..."
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChangeHandler}
        onBlur={() => {
          onChange(selectedOptions.map(option => option.value as MultiFilterValue));
        }}
        fullWidth
        compressed
      />
    </div>
  );
};
