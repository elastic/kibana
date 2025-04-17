/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useMemo } from 'react';
import type {
  CaseCustomFieldList,
  ListCustomFieldConfiguration,
} from '../../../../common/types/domain';
import { OptionalFieldLabel } from '../../optional_field_label';
import type { CustomFieldType } from '../types';
import { getListFieldConfig } from './config';
import { listCustomFieldOptionsToEuiSelectOptions } from './helpers/list_custom_field_options_to_eui_select_options';
import { ClearableSelectField } from './components/clearable_select_field';

const CreateComponent: CustomFieldType<
  CaseCustomFieldList,
  ListCustomFieldConfiguration
>['Create'] = ({ customFieldConfiguration, isLoading, setAsOptional, setDefaultValue = true }) => {
  const { key, label, required, defaultValue, options } = customFieldConfiguration;

  const euiSelectOptions = useMemo(
    () => listCustomFieldOptionsToEuiSelectOptions(options),
    [options]
  );

  const config = getListFieldConfig({
    required: setAsOptional ? false : required,
    label,
    ...(defaultValue && setDefaultValue && { defaultValue: String(defaultValue) }),
  });

  return (
    <UseField
      path={`customFields.${key}`}
      config={config}
      component={ClearableSelectField}
      label={label}
      componentProps={{
        labelAppend: setAsOptional ? OptionalFieldLabel : null,
        isClearable: setAsOptional || !required,
        euiFieldProps: {
          'data-test-subj': `${key}-list-create-custom-field`,
          fullWidth: true,
          disabled: isLoading,
          isLoading,
          options: euiSelectOptions,
        },
      }}
    />
  );
};

CreateComponent.displayName = 'Create';

export const Create = React.memo(CreateComponent);
