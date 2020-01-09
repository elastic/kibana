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
import { ErrableFormRow } from '../../../../../components/form_errors';
import { WebhookAction } from '../../../../../../../../common/types/action_types';

interface Props {
  action: WebhookAction;
  editAction: (changedProperty: { key: string; value: any }) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

const HTTP_VERBS = ['head', 'get', 'post', 'put', 'delete'];

const SCHEME = ['http', 'https'];

export const WebhookActionFields: React.FunctionComponent<Props> = ({
  action,
  editAction,
  errors,
  hasErrors,
}) => {
  const { method, host, port, scheme, path, body, username, password } = action;

  useEffect(() => {
    editAction({ key: 'contentType', value: 'application/json' }); // set content-type for threshold watch to json by default
  }, [editAction]);

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.watcher.sections.watchEdit.threshold.webhookAction.methodFieldLabel',
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
                editAction({ key: 'method', value: e.target.value });
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.watcher.sections.watchEdit.threshold.webhookAction.schemeFieldLabel',
              {
                defaultMessage: 'Scheme',
              }
            )}
          >
            <EuiSelect
              name="scheme"
              value={scheme}
              data-test-subj="webhookSchemeSelect"
              options={SCHEME.map(verb => ({ text: verb, value: verb }))}
              onChange={e => {
                editAction({ key: 'scheme', value: e.target.value });
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
              'xpack.watcher.sections.watchEdit.threshold.webhookAction.hostFieldLabel',
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
                editAction({ key: 'host', value: e.target.value });
              }}
              onBlur={() => {
                if (!host) {
                  editAction({ key: 'host', value: '' });
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
              'xpack.watcher.sections.watchEdit.threshold.webhookAction.methodPortLabel',
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
                editAction({ key: 'port', value: parseInt(e.target.value, 10) });
              }}
              onBlur={() => {
                if (!port) {
                  editAction({ key: 'port', value: '' });
                }
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.watcher.sections.watchEdit.threshold.webhookAction.pathFieldLabel',
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
                editAction({ key: 'path', value: e.target.value });
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
              'xpack.watcher.sections.watchEdit.threshold.webhookAction.basicAuthUsername',
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
                editAction({ key: 'username', value: e.target.value });
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
              'xpack.watcher.sections.watchEdit.threshold.webhookAction.basicAuthPassword',
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
                editAction({ key: 'password', value: e.target.value });
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <ErrableFormRow
        id="webhookBody"
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.webhookAction.bodyFieldLabel',
          {
            defaultMessage: 'Body',
          }
        )}
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
            'xpack.watcher.sections.watchEdit.threshold.webhookAction.bodyCodeEditorAriaLabel',
            {
              defaultMessage: 'Code editor',
            }
          )}
          value={body || ''}
          onChange={(json: string) => {
            editAction({ key: 'body', value: json });
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
