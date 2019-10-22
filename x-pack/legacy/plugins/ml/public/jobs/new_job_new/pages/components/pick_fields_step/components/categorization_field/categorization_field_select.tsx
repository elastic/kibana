/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';

import { Field, EVENT_RATE_FIELD_ID } from '../../../../../../../../common/types/fields';
import { ES_FIELD_TYPES } from '../../../../../../../../../../../../src/plugins/data/public';

interface Props {
  fields: Field[];
  changeHandler(i: string | null): void;
  selectedField: string | null;
}

export const CategorizationFieldSelect: FC<Props> = ({ fields, changeHandler, selectedField }) => {
  const options: EuiComboBoxOptionProps[] = fields
    .filter(f => f.id !== EVENT_RATE_FIELD_ID && f.type === ES_FIELD_TYPES.KEYWORD)
    .map(f => ({
      label: f.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const selection: EuiComboBoxOptionProps[] = [
    {
      label: selectedField !== null ? selectedField : '',
    },
  ];

  function onChange(selectedOptions: EuiComboBoxOptionProps[]) {
    const option = selectedOptions[0];
    if (typeof option !== 'undefined') {
      changeHandler(option.label);
    } else {
      changeHandler(null);
    }
  }

  return (
    <EuiComboBox
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={true}
      data-test-subj="mlCategorizationFieldNameSelect"
    />
  );
};
