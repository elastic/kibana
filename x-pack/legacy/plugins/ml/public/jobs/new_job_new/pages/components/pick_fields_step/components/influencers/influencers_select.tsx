/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';

import { Field, SplitField } from '../../../../../../../../common/types/fields';

interface Props {
  fields: Field[];
  changeHandler(i: string[]): void;
  selectedInfluencers: string[];
  splitField: SplitField;
}

export const InfluencersSelect: FC<Props> = ({
  fields,
  changeHandler,
  selectedInfluencers,
  splitField,
}) => {
  const options: EuiComboBoxOptionProps[] = fields.map(f => ({
    label: f.name,
  }));
  const selection: EuiComboBoxOptionProps[] = selectedInfluencers.map(i => ({ label: i }));

  function onChange(selectedOptions: EuiComboBoxOptionProps[]) {
    changeHandler(selectedOptions.map(o => o.label));
  }

  return (
    <EuiComboBox
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={false}
    />
  );
};
