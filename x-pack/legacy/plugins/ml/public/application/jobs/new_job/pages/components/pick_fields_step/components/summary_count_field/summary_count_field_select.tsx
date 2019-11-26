/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { Field } from '../../../../../../../../../common/types/fields';
import {
  createFieldOptions,
  createScriptFieldOptions,
} from '../../../../../common/job_creator/util/general';

interface Props {
  fields: Field[];
  changeHandler(i: string | null): void;
  selectedField: string | null;
}

export const SummaryCountFieldSelect: FC<Props> = ({ fields, changeHandler, selectedField }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const options: EuiComboBoxOptionProps[] = [
    ...createFieldOptions(fields),
    ...createScriptFieldOptions(jobCreator.scriptFields),
  ];

  const selection: EuiComboBoxOptionProps[] = [];
  if (selectedField !== null) {
    selection.push({ label: selectedField });
  }

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
      data-test-subj="mlSummaryCountFieldNameSelect"
    />
  );
};
