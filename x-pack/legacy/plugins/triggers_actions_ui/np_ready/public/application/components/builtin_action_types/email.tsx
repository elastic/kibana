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
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../page_error';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ActionConnector,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.email',
    iconClass: 'email',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.emailAction.selectMessageText',
      {
        defaultMessage: 'Configure settings to send email through your mail server',
      }
    ),
    validateConnector: (action: ActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        from: new Array<string>(),
        service: new Array<string>(),
        port: new Array<string>(),
        host: new Array<string>(),
        user: new Array<string>(),
        password: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.config.from) {
        errors.from.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredFromText',
            {
              defaultMessage: 'From is required.',
            }
          )
        );
      }
      if (!action.config.port && !action.config.service) {
        errors.port.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPortText',
            {
              defaultMessage: 'Port or Service is required.',
            }
          )
        );
      }
      if (!action.config.service && (!action.config.port || !action.config.host)) {
        errors.service.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredServiceText',
            {
              defaultMessage: 'Service or host with port is required.',
            }
          )
        );
      }
      if (!action.config.host && !action.config.service) {
        errors.host.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredHostText',
            {
              defaultMessage: 'Host or Service is required.',
            }
          )
        );
      }
      if (!action.secrets.user) {
        errors.user.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredUserText',
            {
              defaultMessage: 'User is required.',
            }
          )
        );
      }
      if (!action.secrets.password) {
        errors.password.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPasswordText',
            {
              defaultMessage: 'Password is required.',
            }
          )
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
        (!actionParams.to || !(actionParams.to instanceof Array) || actionParams.to.length === 0) &&
        (!actionParams.cc || !(actionParams.cc instanceof Array) || actionParams.cc.length === 0) &&
        (!actionParams.bcc || !(actionParams.bcc instanceof Array) || actionParams.bcc.length === 0)
      ) {
        const errorText = i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredEntryText',
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
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      if (!actionParams.subject) {
        errors.subject.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredSubjectText',
            {
              defaultMessage: 'Subject is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: EmailActionConnectorFields,
    actionParamsFields: EmailParamsFields,
  };
}

const EmailActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  action,
  editActionConfig,
  editActionSecrets,
  errors,
  hasErrors,
}) => {
  const { from, host, port, secure, service } = action.config;
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
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.fromTextFieldLabel',
          {
            defaultMessage: 'From',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="from"
          value={from || ''}
          data-test-subj="emailFromInput"
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
      <ErrableFormRow
        id="service"
        errorKey="service"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && service !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.serviceTextFieldLabel',
          {
            defaultMessage: 'Service',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="service"
          value={service || ''}
          data-test-subj="emailServiceInput"
          onChange={e => {
            editActionConfig('service', e.target.value);
          }}
          onBlur={() => {
            if (!service) {
              editActionConfig('service', '');
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
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.hostTextFieldLabel',
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
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.portTextFieldLabel',
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
        <EuiFlexItem>
          <EuiSwitch
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.secureSwitchLabel',
              {
                defaultMessage: 'Secure',
              }
            )}
            checked={secure || false}
            onChange={e => {
              editActionConfig('secure', e.target.checked);
            }}
          />
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
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
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
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.passwordFieldLabel',
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
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientTextFieldLabel',
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
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientCopyTextFieldLabel',
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
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientBccTextFieldLabel',
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
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.subjectTextFieldLabel',
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
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.messageTextAreaFieldLabel',
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
