/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField, useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { ConnectorFieldsProps } from '../types';
import * as i18n from './translations';
import { TheHiveTLP } from './types';

const { emptyField } = fieldValidators;

const tlpOptions = Object.entries(TheHiveTLP).reduce<Array<{ text: string; value: number }>>(
  (acc, [key, value]) => (typeof value === 'number' ? [...acc, { text: key, value }] : acc),
  []
);

const TheHiveFieldsComponent: React.FunctionComponent<ConnectorFieldsProps> = () => {
  const form = useFormContext();

  const onTLPChange: (value: string) => void = (value: string) => {
    form.setFieldValue('fields.tlp', parseInt(value, 10));
  };

  return (
    <div data-test-subj={'connector-fields-Thehive'}>
      <UseField
        path="fields.tlp"
        component={SelectField}
        config={{
          label: i18n.TLP_LABEL,
          validations: [
            {
              validator: emptyField(i18n.TLP_REQUIRED),
            },
          ],
          defaultValue: TheHiveTLP.AMBER,
        }}
        onChange={onTLPChange}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'tlp-field',
            options: tlpOptions,
            fullWidth: true,
          },
        }}
      />
    </div>
  );
};

TheHiveFieldsComponent.displayName = 'ThehiveFields';

// eslint-disable-next-line import/no-default-export
export { TheHiveFieldsComponent as default };
