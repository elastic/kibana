/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ActionConnectorFieldsProps } from '../../../types';

const TestConnector: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
  registerPreSubmitValidator,
}) => {
  const preSubmitValidator = useCallback(async () => {}, []);

  useEffect(
    () => registerPreSubmitValidator(preSubmitValidator),
    [preSubmitValidator, registerPreSubmitValidator]
  );

  return (
    <>
      <UseField
        path="config.testTextField"
        component={TextField}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'test-connector-text-field',
            fullWidth: true,
          },
        }}
      />
      <UseField
        path="secrets.secretTextField"
        component={TextField}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'test-connector-secret-text-field',
            fullWidth: true,
          },
        }}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TestConnector as default };
