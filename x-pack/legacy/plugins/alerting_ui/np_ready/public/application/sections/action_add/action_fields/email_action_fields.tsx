/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText, EuiFlexItem, EuiFlexGroup, EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Action } from '../../../lib/api';
import { ErrableFormRow } from '../../../components/page_error';

interface Props {
  action: Action;
  editActionConfig: (property: string, value: any) => void;
  editActionSecrets: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

export const EmailActionFields: React.FunctionComponent<Props> = ({
  action,
  editActionConfig,
  editActionSecrets,
  errors,
  hasErrors,
}) => {
  const { from, host, port }: any = action.config;
  const { user, password }: any = action.secrets;

  return (
    <Fragment>
      <ErrableFormRow
        id="from"
        errorKey="from"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && from !== undefined}
        label={i18n.translate('xpack.alertingUI.sections.actionAdd.emailAction.fromFieldLabel', {
          defaultMessage: 'From',
        })}
      >
        <EuiFieldText
          fullWidth
          name="from"
          value={from || ''}
          data-test-subj="fromInput"
          onChange={e => {
            editActionConfig('from', e.target.value);
          }}
          onBlur={() => {
            if (!from) {
              editActionConfig('from', '');
            }
          }}
        />
      </ErrableFormRow>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <ErrableFormRow
            id="emailHost"
            errorKey="host"
            fullWidth
            errors={errors}
            isShowingErrors={hasErrors && host !== undefined}
            label={i18n.translate('xpack.alertingUI.sections.actionAdd.emailHost.hostFieldLabel', {
              defaultMessage: 'Host',
            })}
          >
            <EuiFieldText
              fullWidth
              name="host"
              value={host || ''}
              data-test-subj="emailHostInput"
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
            id="emailPort"
            errorKey="port"
            fullWidth
            errors={errors}
            isShowingErrors={hasErrors && port !== undefined}
            label={i18n.translate('xpack.alertingUI.sections.actionAdd.emailPort.methodPortLabel', {
              defaultMessage: 'Port',
            })}
          >
            <EuiFieldNumber
              prepend=":"
              fullWidth
              name="port"
              value={port || ''}
              data-test-subj="emailPortInput"
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
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <ErrableFormRow
            id="emailUser"
            errorKey="user"
            fullWidth
            errors={errors}
            isShowingErrors={hasErrors && user !== undefined}
            label={i18n.translate('xpack.alertingUI.sections.actionAdd.emailUser.userFieldLabel', {
              defaultMessage: 'User',
            })}
          >
            <EuiFieldText
              fullWidth
              name="user"
              value={user || ''}
              data-test-subj="emailUserInput"
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
            id="emailPassword"
            errorKey="password"
            fullWidth
            errors={errors}
            isShowingErrors={hasErrors && password !== undefined}
            label={i18n.translate(
              'xpack.alertingUI.sections.actionAdd.emailPassword.methodPasswordLabel',
              {
                defaultMessage: 'Password',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              name="password"
              value={password || ''}
              data-test-subj="emailPasswordInput"
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
    </Fragment>
  );
};
