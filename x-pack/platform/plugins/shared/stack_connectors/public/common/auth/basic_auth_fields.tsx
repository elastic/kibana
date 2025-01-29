/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field, PasswordField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import * as i18n from './translations';

const { emptyField } = fieldValidators;

interface BasicAuthProps {
  readOnly: boolean;
}

export const BasicAuthFields: React.FC<BasicAuthProps> = ({ readOnly }) => (
  <EuiFlexGroup justifyContent="spaceBetween" data-test-subj="basicAuthFields">
    <EuiFlexItem>
      <UseField
        path="secrets.user"
        config={{
          label: i18n.USERNAME,
          validations: [
            {
              validator: emptyField(i18n.USERNAME_REQUIRED),
            },
          ],
        }}
        component={Field}
        componentProps={{
          euiFieldProps: { readOnly, 'data-test-subj': 'webhookUserInput', fullWidth: true },
        }}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <UseField
        path="secrets.password"
        config={{
          label: i18n.PASSWORD,
          validations: [
            {
              validator: emptyField(i18n.PASSWORD_REQUIRED),
            },
          ],
        }}
        component={PasswordField}
        componentProps={{
          euiFieldProps: { readOnly, 'data-test-subj': 'webhookPasswordInput' },
        }}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
