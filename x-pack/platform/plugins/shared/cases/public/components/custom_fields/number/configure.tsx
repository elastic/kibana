/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CheckBoxField, NumericField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CaseCustomFieldNumber } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import { getNumberFieldConfig } from './config';
import * as i18n from '../translations';
import { OptionalFieldLabel } from '../../optional_field_label';

const ConfigureComponent: CustomFieldType<CaseCustomFieldNumber>['Configure'] = () => {
  const config = getNumberFieldConfig({
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
          'data-test-subj': 'number-custom-field-required-wrapper',
          euiFieldProps: {
            label: i18n.FIELD_OPTION_REQUIRED,
            'data-test-subj': 'number-custom-field-required',
          },
        }}
      />
      <UseField
        path="defaultValue"
        component={NumericField}
        config={config}
        componentProps={{
          label: i18n.DEFAULT_VALUE,
          labelAppend: OptionalFieldLabel,
          euiFieldProps: {
            'data-test-subj': 'number-custom-field-default-value',
            step: 1,
          },
        }}
      />
    </>
  );
};

ConfigureComponent.displayName = 'Configure';

export const Configure = React.memo(ConfigureComponent);
