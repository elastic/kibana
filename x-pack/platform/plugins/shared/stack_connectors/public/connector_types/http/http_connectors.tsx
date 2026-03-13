/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  useConnectorContext,
  type ActionConnectorFieldsProps,
} from '@kbn/triggers-actions-ui-plugin/public';

import * as i18n from './translations';

const { urlField } = fieldValidators;

const LazyLoadedAuthConfig = React.lazy(() => import('../../common/auth/auth_config'));

const HttpActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const {
    services: { isWebhookSslWithPfxEnabled: isPfxEnabled },
  } = useConnectorContext();
  return (
    <>
      <UseField
        path="config.url"
        config={{
          label: i18n.BASE_URL_LABEL,
          validations: [
            {
              validator: urlField(i18n.BASE_URL_INVALID),
            },
          ],
        }}
        component={Field}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'httpUrlText',
            fullWidth: true,
            placeholder: 'https://example.com/api/v1',
          },
        }}
      />
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
export { HttpActionConnectorFields as default };
