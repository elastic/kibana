/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import type { FieldConfig } from '../../../shared_imports';
import { TextField, UseField, fieldValidators } from '../../../shared_imports';
import { PARAMETERS_DEFINITION } from '../../../constants';

const { emptyField } = fieldValidators;
const { validations, ...rest } = PARAMETERS_DEFINITION.name.fieldConfig as FieldConfig;

export const SourceNameParameter: React.FC = () => {
  const sourceNameConfig: FieldConfig = useMemo(
    () => ({
      ...rest,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.sourceNameFieldLabel', {
        defaultMessage: 'Field name',
      }),
      helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.sourceNameFieldHelpText', {
        defaultMessage: 'Name of the field in the source files.',
      }),
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.sourceNameIsRequiredErrorMessage',
              {
                defaultMessage: 'Give a name to the field.',
              }
            )
          ),
        },
      ],
    }),
    []
  );

  return (
    <UseField
      path="sourceName"
      config={sourceNameConfig}
      component={TextField}
      componentProps={{
        euiFieldProps: {
          'data-test-subj': 'sourceNameParameterInput',
        },
      }}
    />
  );
};
