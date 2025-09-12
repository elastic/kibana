/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field, SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { type ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';

const HTTP_VERBS = ['get', 'put', 'post', 'delete', 'patch'];

const HttpRequestConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <UseField
            path="config.method"
            component={SelectField}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.components.httpRequest.methodTextFieldLabel',
                {
                  defaultMessage: 'Method',
                }
              ),
              defaultValue: 'post',
            }}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'httpRequestMethodSelect',
                options: HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb })),
                fullWidth: true,
                readOnly,
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="config.url"
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.components.httpRequest.urlTextFieldLabel',
                {
                  defaultMessage: 'URL',
                }
              ),
            }}
            component={Field}
            componentProps={{
              euiFieldProps: { readOnly, 'data-test-subj': 'webhookUrlText', fullWidth: true },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { HttpRequestConnectorFields as default };
