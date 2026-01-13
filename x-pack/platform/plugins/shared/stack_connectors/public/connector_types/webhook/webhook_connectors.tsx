/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field, SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  useConnectorContext,
  type ActionConnectorFieldsProps,
} from '@kbn/triggers-actions-ui-plugin/public';

import { WebhookMethods } from '@kbn/connector-schemas/common/auth/constants';
import * as i18n from './translations';

const HTTP_VERBS = [
  WebhookMethods.POST,
  WebhookMethods.PUT,
  WebhookMethods.PATCH,
  WebhookMethods.GET,
  WebhookMethods.DELETE,
];
const { emptyField, urlField } = fieldValidators;

const LazyLoadedAuthConfig = React.lazy(() => import('../../common/auth/auth_config'));

const WebhookActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const {
    services: { isWebhookSslWithPfxEnabled: isPfxEnabled },
  } = useConnectorContext();
  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <UseField
            path="config.method"
            component={SelectField}
            config={{
              label: i18n.METHOD_LABEL,
              defaultValue: WebhookMethods.POST,
              validations: [
                {
                  validator: emptyField(i18n.METHOD_REQUIRED),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'webhookMethodSelect',
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
              label: i18n.URL_LABEL,
              validations: [
                {
                  validator: urlField(i18n.URL_INVALID),
                },
              ],
            }}
            component={Field}
            componentProps={{
              euiFieldProps: { readOnly, 'data-test-subj': 'webhookUrlText', fullWidth: true },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <React.Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <LazyLoadedAuthConfig
          readOnly={readOnly}
          isPfxEnabled={isPfxEnabled}
          isOAuth2Enabled={true}
        />
      </React.Suspense>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { WebhookActionConnectorFields as default };
