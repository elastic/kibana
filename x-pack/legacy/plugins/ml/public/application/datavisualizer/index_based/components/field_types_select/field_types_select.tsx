/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiSelect } from '@elastic/eui';

import { ML_JOB_FIELD_TYPES } from '../../../../../../common/constants/field_types';

interface Props {
  fieldTypes: ML_JOB_FIELD_TYPES[];
  selectedFieldType: ML_JOB_FIELD_TYPES | '*';
  setSelectedFieldType(t: ML_JOB_FIELD_TYPES | '*'): void;
}

export const FieldTypesSelect: FC<Props> = ({
  fieldTypes,
  selectedFieldType,
  setSelectedFieldType,
}) => {
  const options = [
    {
      value: '*',
      text: i18n.translate('xpack.ml.datavisualizer.fieldTypesSelect.allFieldsTypeOptionLabel', {
        defaultMessage: 'All field types',
      }),
    },
  ];
  fieldTypes.forEach(fieldType => {
    options.push({
      value: fieldType,
      text: i18n.translate('xpack.ml.datavisualizer.fieldTypesSelect.typeOptionLabel', {
        defaultMessage: '{fieldType} types',
        values: {
          fieldType,
        },
      }),
    });
  });

  return (
    <EuiSelect
      options={options}
      value={selectedFieldType}
      onChange={e => setSelectedFieldType(e.target.value as ML_JOB_FIELD_TYPES | '*')}
      aria-label={i18n.translate('xpack.ml.datavisualizer.fieldTypesSelect.selectAriaLabel', {
        defaultMessage: 'Select field types to display',
      })}
      data-test-subj="mlDataVisualizerFieldTypesSelect"
    />
  );
};
