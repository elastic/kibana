/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField, PasswordField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from '../translations';

interface Props {
  readOnly: boolean;
}

const { emptyField, urlField } = fieldValidators;

const SwimlaneConnectionComponent: React.FunctionComponent<Props> = ({ readOnly }) => {
  const { docLinks } = useKibana().services;
  return (
    <>
      <UseField
        path="config.apiUrl"
        component={TextField}
        config={{
          label: i18n.SW_API_URL_TEXT_FIELD_LABEL,
          validations: [
            {
              validator: urlField(i18n.SW_API_URL_INVALID),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'swimlaneApiUrlInput',
            readOnly,
          },
        }}
      />
      <UseField
        path="config.appId"
        component={TextField}
        config={{
          label: i18n.SW_APP_ID_TEXT_FIELD_LABEL,
          validations: [
            {
              validator: emptyField(i18n.SW_REQUIRED_APP_ID_TEXT),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'swimlaneAppIdInput',
            readOnly,
          },
        }}
      />
      <UseField
        path="secrets.apiToken"
        config={{
          label: i18n.SW_API_TOKEN_TEXT_FIELD_LABEL,
          validations: [
            {
              validator: emptyField(i18n.SW_REQUIRED_API_TOKEN),
            },
          ],
          helpText: (
            <EuiLink
              href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/swimlane-action-type.html`}
              target="_blank"
            >
              <FormattedMessage
                id="xpack.stackConnectors.components.swimlane.apiTokenNameHelpLabel"
                defaultMessage="Provide a Swimlane API Token"
              />
            </EuiLink>
          ),
        }}
        component={PasswordField}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'swimlaneApiTokenInput',
            readOnly,
          },
        }}
      />
    </>
  );
};

export const SwimlaneConnection = React.memo(SwimlaneConnectionComponent);
