/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CheckBoxField, TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CaseCustomFieldText } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import { getTextFieldConfig } from './config';
import { OptionalFieldLabel } from '../../optional_field_label';
import * as i18n from '../translations';

const ConfigureComponent: CustomFieldType<CaseCustomFieldText>['Configure'] = () => {
  const config = getTextFieldConfig({
    required: false,
    label: i18n.DEFAULT_VALUE.toLocaleLowerCase(),
  });

  return (
    <>
      <UseField
        path="required"
        component={CheckBoxField}
        componentProps={{
          label: i18n.FIELD_OPTIONS,
          'data-test-subj': 'text-custom-field-required-wrapper',
          euiFieldProps: {
            label: i18n.FIELD_OPTION_REQUIRED,
            'data-test-subj': 'text-custom-field-required',
          },
        }}
      />
      <UseField
        path="defaultValue"
        component={TextField}
        config={config}
        componentProps={{
          label: i18n.DEFAULT_VALUE,
          labelAppend: OptionalFieldLabel,
          euiFieldProps: {
            'data-test-subj': 'text-custom-field-default-value',
          },
        }}
      />
    </>
  );
};

ConfigureComponent.displayName = 'Configure';

export const Configure = React.memo(ConfigureComponent);
