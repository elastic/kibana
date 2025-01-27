/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldConfig, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { DocLinksStart } from '@kbn/core/public';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';

const { emptyField, urlField } = fieldValidators;

const getApiURLConfig = (): FieldConfig => ({
  label: i18n.API_URL_LABEL,
  labelAppend: (
    <EuiText size="xs" color="subdued">
      {i18n.OPTIONAL_LABEL}
    </EuiText>
  ),
  validations: [
    {
      validator: (args) => {
        const { value } = args;
        /**
         * The field is optional so if it is empty
         * we do not validate
         */
        if (isEmpty(value)) {
          return;
        }

        return urlField(i18n.API_URL_INVALID)(args);
      },
    },
  ],
});

const getRoutingKeyConfig = (docLinks: DocLinksStart): FieldConfig => ({
  label: i18n.INTEGRATION_KEY_LABEL,
  helpText: (
    <EuiLink href={docLinks.links.alerting.pagerDutyAction} target="_blank">
      <FormattedMessage
        id="xpack.stackConnectors.components.pagerDuty.routingKeyNameHelpLabel"
        defaultMessage="Configure a PagerDuty account"
      />
    </EuiLink>
  ),
  validations: [
    {
      validator: emptyField(i18n.INTEGRATION_KEY_REQUIRED),
    },
  ],
});

const PagerDutyActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const { docLinks } = useKibana().services;

  return (
    <>
      <UseField
        path="config.apiUrl"
        component={Field}
        config={getApiURLConfig()}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'pagerdutyApiUrlInput',
            fullWidth: true,
          },
        }}
      />
      <UseField
        path="secrets.routingKey"
        config={getRoutingKeyConfig(docLinks)}
        component={Field}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'pagerdutyRoutingKeyInput',
            fullWidth: true,
          },
        }}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { PagerDutyActionConnectorFields as default };
