/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField, HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';

interface FormFieldsProps {
  isSubmitting?: boolean;
}

const FormFieldsComponent: React.FC<FormFieldsProps> = ({ isSubmitting }) => {
  const labelFieldProps = useMemo(
    () => ({
      euiFieldProps: {
        'data-test-subj': 'observable-type-label-input',
        fullWidth: true,
        autoFocus: true,
        isLoading: isSubmitting,
      },
    }),
    [isSubmitting]
  );

  return (
    <>
      <UseField path="key" component={HiddenField} />
      <UseField path="label" component={TextField} componentProps={labelFieldProps} />
    </>
  );
};

FormFieldsComponent.displayName = 'FormFields';

export const FormFields = memo(FormFieldsComponent);
