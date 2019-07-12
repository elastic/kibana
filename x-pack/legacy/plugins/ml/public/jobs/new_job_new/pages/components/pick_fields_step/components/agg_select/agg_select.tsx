/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';

import { Field, Aggregation, AggFieldPair } from '../../../../../../../../common/types/fields';

// The display label used for an aggregation e.g. sum(bytes).
export type Label = string;

// Label object structured for EUI's ComboBox.
export interface DropDownLabel {
  label: Label;
  agg: Aggregation;
  field: Field;
}

// Label object structure for EUI's ComboBox with support for nesting.
export interface DropDownOption {
  label: Label;
  options: DropDownLabel[];
}

export type DropDownProps = DropDownLabel[] | EuiComboBoxOptionProps[];

interface Props {
  fields: Field[];
  changeHandler(d: EuiComboBoxOptionProps[]): void;
  selectedOptions: EuiComboBoxOptionProps[];
  removeOptions: AggFieldPair[];
}

export const AggSelect: FC<Props> = ({ fields, changeHandler, selectedOptions, removeOptions }) => {
  // create list of labels based on already selected detectors
  // so they can be removed from the dropdown list
  const removeLabels = removeOptions.map(o => `${o.agg.title}(${o.field.name})`);

  const options: EuiComboBoxOptionProps[] = fields.map(f => {
    const aggOption: DropDownOption = { label: f.name, options: [] };
    if (typeof f.aggs !== 'undefined') {
      aggOption.options = f.aggs
        .map(
          a =>
            ({
              label: `${a.title}(${f.name})`,
              agg: a,
              field: f,
            } as DropDownLabel)
        )
        .filter(o => removeLabels.includes(o.label) === false);
    }
    return aggOption;
  });

  return (
    <Fragment>
      <EuiComboBox
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        onChange={changeHandler}
        isClearable={false}
      />
    </Fragment>
  );
};
