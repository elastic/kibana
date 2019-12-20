/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';

import { ML_JOB_AGGREGATION } from '../../../../../../../../../common/constants/aggregation_types';

interface Props {
  changeHandler(i: ML_JOB_AGGREGATION.COUNT | ML_JOB_AGGREGATION.RARE): void;
  selectedDetectorType: ML_JOB_AGGREGATION.COUNT | ML_JOB_AGGREGATION.RARE;
}

export const CategorizationDetectorSelect: FC<Props> = ({
  changeHandler,
  selectedDetectorType,
}) => {
  const options: EuiComboBoxOptionProps[] = [
    { label: 'Count', value: ML_JOB_AGGREGATION.COUNT },
    { label: 'Rare', value: ML_JOB_AGGREGATION.RARE },
  ];

  const selection = [options.find(o => o.value === selectedDetectorType) || options[0]];

  function onChange(selectedOptions: EuiComboBoxOptionProps[]) {
    const option = selectedOptions[0];
    changeHandler(option.value as ML_JOB_AGGREGATION.COUNT | ML_JOB_AGGREGATION.RARE);
  }

  return (
    <EuiComboBox
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={false}
      data-test-subj="mlCategorizationFieldNameSelect"
    />
  );
};
