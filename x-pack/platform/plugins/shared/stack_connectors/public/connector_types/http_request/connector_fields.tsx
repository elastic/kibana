/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field, SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { type ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';

const HTTP_VERBS = ['get', 'put', 'post', 'delete', 'patch'];
const CONTENT_TYPES: Record<string, string> = {
  json: i18n.translate('xpack.stackConnectors.components.httpRequest.contentTypes.json', {
    defaultMessage: 'JSON',
  }),
  xml: i18n.translate('xpack.stackConnectors.components.httpRequest.contentTypes.xml', {
    defaultMessage: 'XML',
  }),
  form: i18n.translate('xpack.stackConnectors.components.httpRequest.contentTypes.form', {
    defaultMessage: 'Form',
  }),
  data: i18n.translate('xpack.stackConnectors.components.httpRequest.contentTypes.data', {
    defaultMessage: 'Data',
  }),
  custom: i18n.translate('xpack.stackConnectors.components.httpRequest.contentTypes.custom', {
    defaultMessage: 'Custom',
  }),
};

const HttpRequestConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const [{ config }] = useFormData({
    watch: ['config.contentType'],
  });

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
              euiFieldProps: { readOnly, 'data-test-subj': 'httpRequestUrlText', fullWidth: true },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <UseField
            path="config.contentType"
            component={SelectField}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.components.httpRequest.contentTypeTextFieldLabel',
                {
                  defaultMessage: 'Content Type',
                }
              ),
              defaultValue: 'json',
            }}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'httpRequestContentTypeSelect',
                options: Object.keys(CONTENT_TYPES).map((key) => ({
                  text: CONTENT_TYPES[key],
                  value: key,
                })),
                fullWidth: true,
                readOnly,
              },
            }}
          />
        </EuiFlexItem>
        {config && config.contentType === 'custom' && (
          <EuiFlexItem>
            <UseField
              path="config.customContentType"
              config={{
                label: i18n.translate(
                  'xpack.stackConnectors.components.httpRequest.cutomContentTypeTextFieldLabel',
                  {
                    defaultMessage: 'Custom Content Type',
                  }
                ),
              }}
              component={Field}
              componentProps={{
                euiFieldProps: {
                  readOnly,
                  'data-test-subj': 'customContentTypeText',
                  fullWidth: true,
                },
              }}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { HttpRequestConnectorFields as default };
