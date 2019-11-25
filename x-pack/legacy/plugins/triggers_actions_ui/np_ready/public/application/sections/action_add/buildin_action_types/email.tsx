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
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/page_error';
import {
  ActionTypeModel,
  Props,
  Action,
  ValidationResult,
  ActionParamsProps,
} from '../../../../types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.email',
    iconClass: 'email',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.sections.actionAdd.emailAction.selectMessageText',
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
          i18n.translate('xpack.triggersActionsUI.sections.addAction.error.requiredFromText', {
            defaultMessage: 'From is required.',
          })
        );
      }
      if (!action.config.port) {
        errors.port.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAction.error.requiredPortText', {
            defaultMessage: 'Port is required.',
          })
        );
      }
      if (!action.config.host) {
        errors.host.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAction.error.requiredHostText', {
            defaultMessage: 'Host is required.',
          })
        );
      }
      if (!action.secrets.user) {
        errors.user.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAction.error.requiredUserText', {
            defaultMessage: 'User is required.',
          })
        );
      }
      if (!action.secrets.password) {
        errors.password.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAction.error.requiredPasswordText', {
            defaultMessage: 'Password is required.',
          })
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: any): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        to: new Array<string>(),
        cc: new Array<string>(),
        bcc: new Array<string>(),
        message: new Array<string>(),
        subject: new Array<string>(),
      };
      validationResult.errors = errors;
      if (
        ((!actionParams.to || actionParams.to.length === 0) &&
          (!actionParams.cc || actionParams.cc.length === 0)) ||
        !actionParams.bcc ||
        actionParams.bcc.length === 0
      ) {
        const errorText = i18n.translate(
          'xpack.triggersActionsUI.sections.addAction.error.requiredEntryText',
          {
            defaultMessage: 'No [to], [cc], or [bcc] entries. At least one entry is required.',
          }
        );
        errors.to.push(errorText);
        errors.cc.push(errorText);
        errors.bcc.push(errorText);
      }
      if (!actionParams.message) {
        errors.message.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAction.error.requiredMessageText', {
            defaultMessage: 'Message is required.',
          })
        );
      }
      if (!actionParams.subject) {
        errors.subject.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAction.error.requiredSubjectText', {
            defaultMessage: 'Subject is required.',
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
        isShowingErrors={hasErrors && from !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.actionAdd.emailAction.fromTextFieldLabel',
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
            isShowingErrors={hasErrors && host !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.actionAdd.emailAction.hostTextFieldLabel',
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
            isShowingErrors={hasErrors && port !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.actionAdd.emailAction.portTextFieldLabel',
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
            isShowingErrors={hasErrors && user !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.actionAdd.emailAction.userTextFieldLabel',
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
            isShowingErrors={hasErrors && password !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.actionAdd.emailAction.passwordFieldLabel',
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

const EmailParamsFields: React.FunctionComponent<ActionParamsProps> = ({
  action,
  editAction,
  index,
  errors,
  hasErrors,
}) => {
  const { to, cc, bcc, subject, message } = action;
  const toOptions = to ? to.map((label: string) => ({ label })) : [];
  const ccOptions = cc ? cc.map((label: string) => ({ label })) : [];
  const bccOptions = bcc ? bcc.map((label: string) => ({ label })) : [];

  return (
    <Fragment>
      <ErrableFormRow
        errorKey="to"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && to !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.actionAdd.emailAction.recipientTextFieldLabel',
          {
            defaultMessage: 'To',
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
              newOptions.map(newOption => newOption.label),
              index
            );
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            editAction(
              'to',
              selectedOptions.map(selectedOption => selectedOption.label),
              index
            );
          }}
          onBlur={() => {
            if (!to) {
              editAction('to', [], index);
            }
          }}
        />
      </ErrableFormRow>
      <ErrableFormRow
        errorKey="cc"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && cc !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.actionAdd.emailAction.recipientCopyTextFieldLabel',
          {
            defaultMessage: 'Cc',
          }
        )}
      >
        <EuiComboBox
          noSuggestions
          fullWidth
          data-test-subj="ccEmailAddressInput"
          selectedOptions={ccOptions}
          onCreateOption={(searchValue: string) => {
            const newOptions = [...ccOptions, { label: searchValue }];
            editAction(
              'cc',
              newOptions.map(newOption => newOption.label),
              index
            );
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            editAction(
              'cc',
              selectedOptions.map(selectedOption => selectedOption.label),
              index
            );
          }}
          onBlur={() => {
            if (!cc) {
              editAction('cc', [], index);
            }
          }}
        />
      </ErrableFormRow>
      <ErrableFormRow
        errorKey="bcc"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && bcc !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.actionAdd.emailAction.recipientBccTextFieldLabel',
          {
            defaultMessage: 'Bcc',
          }
        )}
      >
        <EuiComboBox
          noSuggestions
          fullWidth
          data-test-subj="bccEmailAddressInput"
          selectedOptions={bccOptions}
          onCreateOption={(searchValue: string) => {
            const newOptions = [...bccOptions, { label: searchValue }];
            editAction(
              'bcc',
              newOptions.map(newOption => newOption.label),
              index
            );
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            editAction(
              'bcc',
              selectedOptions.map(selectedOption => selectedOption.label),
              index
            );
          }}
          onBlur={() => {
            if (!bcc) {
              editAction('bcc', [], index);
            }
          }}
        />
      </ErrableFormRow>
      <ErrableFormRow
        errorKey="subject"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && message !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.actionAdd.emailAction.subjectTextFieldLabel',
          {
            defaultMessage: 'Subject',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="subject"
          data-test-subj="emailSubjectInput"
          value={subject || ''}
          onChange={e => {
            editAction('subject', e.target.value, index);
          }}
        />
      </ErrableFormRow>
      <ErrableFormRow
        errorKey="message"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && message !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.actionAdd.emailAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
      >
        <EuiTextArea
          fullWidth
          value={message || ''}
          name="message"
          data-test-subj="emailMessageInput"
          onChange={e => {
            editAction('message', e.target.value, index);
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
