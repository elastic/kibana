/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useEffect } from 'react';

import {
  EuiCodeEditor,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/page_error';
import { Action } from '../../../lib/api';

interface Props {
  action: Action;
  editActionConfig: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

const HTTP_VERBS = ['head', 'get', 'post', 'put', 'delete'];

export const WebhookActionFields: React.FunctionComponent<Props> = ({
  action,
  editActionConfig,
  errors,
  hasErrors,
}) => {
  const { method, host, port, path, body, username, password }: any = action.config;

  useEffect(() => {
    editActionConfig('contentType', 'application/json'); // set content-type for threshold watch to json by default
  }, []);

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.alertingUI.sections.actionAdd.webhookAction.methodFieldLabel',
              {
                defaultMessage: 'Method',
              }
            )}
          >
            <EuiSelect
              name="method"
              value={method || 'get'}
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
            id="webhookHost"
            errorKey="host"
            fullWidth
            errors={errors}
            isShowingErrors={hasErrors && host !== undefined}
            label={i18n.translate(
              'xpack.alertingUI.sections.actionAdd.webhookAction.hostFieldLabel',
              {
                defaultMessage: 'Host',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              name="host"
              value={host || ''}
              data-test-subj="webhookHostInput"
              onChange={e => {
                editActionConfig('host', e.target.value);
              }}
              onBlur={() => {
                if (!host) {
                  editActionConfig('host', '');
                }
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <ErrableFormRow
            id="webhookPort"
            errorKey="port"
            fullWidth
            errors={errors}
            isShowingErrors={hasErrors && port !== undefined}
            label={i18n.translate(
              'xpack.alertingUI.sections.actionAdd.webhookAction.methodPortLabel',
              {
                defaultMessage: 'Port',
              }
            )}
          >
            <EuiFieldNumber
              prepend=":"
              fullWidth
              name="port"
              value={port || ''}
              data-test-subj="webhookPortInput"
              onChange={e => {
                editActionConfig('port', parseInt(e.target.value, 10));
              }}
              onBlur={() => {
                if (!port) {
                  editActionConfig('port', '');
                }
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.alertingUI.sections.actionAdd.webhookAction.pathFieldLabel',
              {
                defaultMessage: 'Path (optional)',
              }
            )}
          >
            <EuiFieldText
              prepend="/"
              fullWidth
              name="path"
              value={path || ''}
              data-test-subj="webhookPathInput"
              onChange={e => {
                editActionConfig('path', e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <ErrableFormRow
            id="webhookBasicAuthUsername"
            errorKey="username"
            isShowingErrors={hasErrors}
            errors={errors}
            label={i18n.translate(
              'xpack.alertingUI.sections.actionAdd.webhookAction.basicAuthUsername',
              {
                defaultMessage: 'Username (optional)',
              }
            )}
          >
            <EuiFieldText
              name="username"
              value={username || ''}
              data-test-subj="webhookUsernameInput"
              onChange={e => {
                editActionConfig('username', e.target.value);
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <ErrableFormRow
            id="webhookBasicAuthPassword"
            errorKey="password"
            isShowingErrors={hasErrors}
            errors={errors}
            label={i18n.translate(
              'xpack.alertingUI.sections.actionAdd.webhookAction.basicAuthPassword',
              {
                defaultMessage: 'Password (optional)',
              }
            )}
          >
            <EuiFieldPassword
              name="password"
              value={password || ''}
              data-test-subj="webhookPasswordInput"
              onChange={e => {
                editActionConfig('password', e.target.value);
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <ErrableFormRow
        id="webhookBody"
        label={i18n.translate('xpack.alertingUI.sections.actionAdd.webhookAction.bodyFieldLabel', {
          defaultMessage: 'Body',
        })}
        errorKey="body"
        isShowingErrors={hasErrors}
        fullWidth
        errors={errors}
      >
        <EuiCodeEditor
          fullWidth
          mode="json"
          width="100%"
          height="200px"
          theme="github"
          data-test-subj="webhookBodyEditor"
          aria-label={i18n.translate(
            'xpack.alertingUI.sections.actionAdd.webhookAction.bodyCodeEditorAriaLabel',
            {
              defaultMessage: 'Code editor',
            }
          )}
          value={body || ''}
          onChange={(json: string) => {
            editActionConfig('body', json);
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
