/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';

import {
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCodeEditor,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/page_error';
import { Action } from '../../../lib/api';

interface Props {
  action: Action;
  editActionConfig: (property: string, value: any) => void;
  editActionJSONConfig: (property: string, value: any) => void;
  editActionSecrets: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

const HTTP_VERBS = ['post', 'put'];

export const WebhookActionFields: React.FunctionComponent<Props> = ({
  action,
  editActionConfig,
  editActionJSONConfig,
  editActionSecrets,
  errors,
  hasErrors,
}) => {
  const { user, password }: any = action.secrets;
  const { method, url, headers }: any = action.config;
  editActionConfig('method', 'post'); // set method to POST by default

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.alertingUI.sections.webhookAction.methodFieldLabel', {
              defaultMessage: 'Method',
            })}
          >
            <EuiSelect
              name="method"
              value={method || 'post'}
              data-test-subj="webhookMethodSelect"
              options={HTTP_VERBS.map(verb => ({ text: verb.toUpperCase(), value: verb }))}
              onChange={e => {
                editActionConfig('method', e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <ErrableFormRow
            id="url"
            fullWidth
            errorKey="url"
            errors={errors}
            isShowingErrors={hasErrors && url !== undefined}
            label={i18n.translate('xpack.alertingUI.sections.slackPassword.methodUrlLabel', {
              defaultMessage: 'Url',
            })}
          >
            <EuiFieldText
              name="url"
              fullWidth
              value={url || ''}
              data-test-subj="slackUrlText"
              onChange={e => {
                editActionConfig('url', e.target.value);
              }}
              onBlur={() => {
                if (!url) {
                  editActionConfig('url', '');
                }
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <ErrableFormRow
            id="webhookUser"
            errorKey="user"
            fullWidth
            errors={errors}
            isShowingErrors={hasErrors && user !== undefined}
            label={i18n.translate('xpack.alertingUI.sections.webhookUser.userFieldLabel', {
              defaultMessage: 'User',
            })}
          >
            <EuiFieldText
              fullWidth
              name="user"
              value={user || ''}
              data-test-subj="webhookUserInput"
              onChange={e => {
                editActionSecrets('user', e.target.value);
              }}
              onBlur={() => {
                if (!user) {
                  editActionSecrets('user', '');
                }
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <ErrableFormRow
            id="webhookPassword"
            errorKey="password"
            fullWidth
            errors={errors}
            isShowingErrors={hasErrors && password !== undefined}
            label={i18n.translate('xpack.alertingUI.sections.webhookPassword.methodPasswordLabel', {
              defaultMessage: 'Password',
            })}
          >
            <EuiFieldPassword
              fullWidth
              name="password"
              value={password || ''}
              data-test-subj="webhookPasswordInput"
              onChange={e => {
                editActionSecrets('password', e.target.value);
              }}
              onBlur={() => {
                if (!password) {
                  editActionSecrets('password', '');
                }
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFormRow
        id="webhookHeaders"
        label={i18n.translate('xpack.alertingUI.sections.webhookAction.headersFieldLabel', {
          defaultMessage: 'Headers',
        })}
        fullWidth
      >
        <EuiTextArea
          fullWidth
          name="headers"
          value={headers}
          data-test-subj="headersTextarea"
          onChange={e => {
            editActionJSONConfig('headers', e.target.value);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
