/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiComboBox,
  EuiFormRow,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/page_error';
import { ActionTypeModel, Props, Action, ValidationResult, ParamsProps } from '../../../../types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.email',
    iconClass: 'email',
    selectMessage: i18n.translate(
      'xpack.alertingUI.sections.actionAdd.emailAction.selectMessageText',
      {
        defaultMessage: 'Send an email.',
      }
    ),
    validate: (action: Action): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        from: new Array<string>(),
        port: new Array<string>(),
        host: new Array<string>(),
        user: new Array<string>(),
        password: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.config.from) {
        errors.from.push(
          i18n.translate('xpack.alertingUI.sections.addAction.error.requiredFromText', {
            defaultMessage: 'From is required.',
          })
        );
      }
      if (!action.config.port) {
        errors.port.push(
          i18n.translate('xpack.alertingUI.sections.addAction.error.requiredPortText', {
            defaultMessage: 'Port is required.',
          })
        );
      }
      if (!action.config.host) {
        errors.host.push(
          i18n.translate('xpack.alertingUI.sections.addAction.error.requiredHostText', {
            defaultMessage: 'Host is required.',
          })
        );
      }
      if (!action.secrets.user) {
        errors.user.push(
          i18n.translate('xpack.alertingUI.sections.addAction.error.requiredUserText', {
            defaultMessage: 'User is required.',
          })
        );
      }
      if (!action.secrets.password) {
        errors.password.push(
          i18n.translate('xpack.alertingUI.sections.addAction.error.requiredPasswordText', {
            defaultMessage: 'Password is required.',
          })
        );
      }
      return validationResult;
    },
    actionFields: EmailActionFields,
    actionParamsFields: EmailParamsFields,
  };
}

const EmailActionFields: React.FunctionComponent<Props> = ({
  action,
  editActionConfig,
  editActionSecrets,
  errors,
  hasErrors,
}) => {
  const { from, host, port } = action.config;
  const { user, password } = action.secrets;

  return (
    <Fragment>
      <ErrableFormRow
        id="from"
        errorKey="from"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors === true && from !== undefined}
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.emailAction.fromTextFieldLabel',
          {
            defaultMessage: 'From',
          }
        )}
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
            isShowingErrors={hasErrors === true && host !== undefined}
            label={i18n.translate(
              'xpack.alertingUI.sections.actionAdd.emailAction.hostTextFieldLabel',
              {
                defaultMessage: 'Host',
              }
            )}
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
            isShowingErrors={hasErrors === true && port !== undefined}
            label={i18n.translate(
              'xpack.alertingUI.sections.actionAdd.emailAction.portTextFieldLabel',
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
            isShowingErrors={hasErrors === true && user !== undefined}
            label={i18n.translate(
              'xpack.alertingUI.sections.actionAdd.emailAction.userTextFieldLabel',
              {
                defaultMessage: 'User',
              }
            )}
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
            isShowingErrors={hasErrors === true && password !== undefined}
            label={i18n.translate(
              'xpack.alertingUI.sections.actionAdd.emailAction.passwordFieldLabel',
              {
                defaultMessage: 'Password',
              }
            )}
          >
            <EuiFieldPassword
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

const EmailParamsFields: React.FunctionComponent<ParamsProps> = ({
  action,
  editAction,
  errors,
  hasErrors,
}) => {
  const { to, subject, body } = action;
  const toOptions = to ? to.map((label: any) => ({ label })) : [];

  return (
    <Fragment>
      <ErrableFormRow
        id="emailRecipient"
        errorKey="to"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors === true && to !== undefined}
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.emailAction.recipientTextFieldLabel',
          {
            defaultMessage: 'To email address',
          }
        )}
      >
        <EuiComboBox
          noSuggestions
          fullWidth
          data-test-subj="toEmailAddressInput"
          selectedOptions={toOptions}
          onCreateOption={(searchValue: string) => {
            const newOptions = [...toOptions, { label: searchValue }];
            editAction(
              'to',
              newOptions.map(newOption => newOption.label)
            );
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            editAction(
              'to',
              selectedOptions.map(selectedOption => selectedOption.label)
            );
          }}
          onBlur={() => {
            if (!to) {
              editAction('to', []);
            }
          }}
        />
      </ErrableFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.emailAction.subjectTextFieldLabel',
          {
            defaultMessage: 'Subject (optional)',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="subject"
          data-test-subj="emailSubjectInput"
          value={subject || ''}
          onChange={e => {
            editAction('subject', e.target.value);
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.alertingUI.sections.actionAdd.emailAction.bodyTextAreaFieldLabel',
          {
            defaultMessage: 'Body',
          }
        )}
      >
        <EuiTextArea
          fullWidth
          value={body || ''}
          name="body"
          data-test-subj="emailBodyInput"
          onChange={e => {
            editAction('body', e.target.value);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
