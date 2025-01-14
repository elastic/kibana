/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { NumericField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CaseCustomFieldNumber } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import { getNumberFieldConfig } from './config';
import { OptionalFieldLabel } from '../../optional_field_label';

const CreateComponent: CustomFieldType<CaseCustomFieldNumber>['Create'] = ({
  customFieldConfiguration,
  isLoading,
  setAsOptional,
  setDefaultValue = true,
}) => {
  const { key, label, required, defaultValue } = customFieldConfiguration;
  const config = getNumberFieldConfig({
    required: setAsOptional ? false : required,
    label,
    ...(defaultValue &&
      setDefaultValue &&
      !isNaN(Number(defaultValue)) && { defaultValue: Number(defaultValue) }),
  });

  return (
    <UseField
      path={`customFields.${key}`}
      config={config}
      component={NumericField}
      label={label}
      componentProps={{
        labelAppend: setAsOptional ? OptionalFieldLabel : null,
        euiFieldProps: {
          'data-test-subj': `${key}-number-create-custom-field`,
          fullWidth: true,
          disabled: isLoading,
          isLoading,
        },
      }}
    />
  );
};

CreateComponent.displayName = 'Create';

export const Create = React.memo(CreateComponent);
