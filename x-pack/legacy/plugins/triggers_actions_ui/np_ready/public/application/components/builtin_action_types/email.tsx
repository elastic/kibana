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
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ActionConnector,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';

export function getActionType(): ActionTypeModel {
  const mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return {
    id: '.email',
    iconClass: 'email',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.emailAction.selectMessageText',
      {
        defaultMessage: 'Send email from your server.',
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
              defaultMessage: 'Sender is required.',
            }
          )
        );
      }
      if (action.config.from && !action.config.from.match(mailformat)) {
        errors.from.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.formatFromText',
            {
              defaultMessage: 'Sender is not a valid email address.',
            }
          )
        );
      }
      if (!action.config.port && !action.config.service) {
        errors.port.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPortText',
            {
              defaultMessage: 'Port is required.',
            }
          )
        );
      }
      if (!action.config.service && (!action.config.port || !action.config.host)) {
        errors.service.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredServiceText',
            {
              defaultMessage: 'Service is required.',
            }
          )
        );
      }
      if (!action.config.host && !action.config.service) {
        errors.host.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredHostText',
            {
              defaultMessage: 'Host is required.',
            }
          )
        );
      }
      if (!action.secrets.user) {
        errors.user.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredUserText',
            {
              defaultMessage: 'Username is required.',
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
        (!(actionParams.to instanceof Array) || actionParams.to.length === 0) &&
        (!(actionParams.cc instanceof Array) || actionParams.cc.length === 0) &&
        (!(actionParams.bcc instanceof Array) || actionParams.bcc.length === 0)
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
}) => {
  const { from, host, port, secure } = action.config;
  const { user, password } = action.secrets;

  return (
    <Fragment>
      <EuiFormRow
        id="from"
        fullWidth
        error={errors.from}
        isInvalid={errors.from.length > 0 && from !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.fromTextFieldLabel',
          {
            defaultMessage: 'Sender',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          isInvalid={errors.from.length > 0 && from !== undefined}
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
      </EuiFormRow>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="emailHost"
            fullWidth
            error={errors.host}
            isInvalid={errors.host.length > 0 && host !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.hostTextFieldLabel',
              {
                defaultMessage: 'Host',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              isInvalid={errors.host.length > 0 && host !== undefined}
              name="host"
              placeholder="localhost"
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
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="emailPort"
            fullWidth
            placeholder="8080"
            error={errors.port}
            isInvalid={errors.port.length > 0 && port !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.portTextFieldLabel',
              {
                defaultMessage: 'Port',
              }
            )}
          >
            <EuiFieldNumber
              prepend=":"
              isInvalid={errors.port.length > 0 && port !== undefined}
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
          </EuiFormRow>
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
          <EuiFormRow
            id="emailUser"
            fullWidth
            error={errors.user}
            isInvalid={errors.user.length > 0 && user !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
              {
                defaultMessage: 'Username',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              isInvalid={errors.user.length > 0 && user !== undefined}
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
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="emailPassword"
            fullWidth
            error={errors.password}
            isInvalid={errors.password.length > 0 && password !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.passwordFieldLabel',
              {
                defaultMessage: 'Password',
              }
            )}
          >
            <EuiFieldPassword
              fullWidth
              isInvalid={errors.password.length > 0 && password !== undefined}
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
          </EuiFormRow>
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
      <EuiFormRow
        fullWidth
        error={errors.to}
        isInvalid={hasErrors && to !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientTextFieldLabel',
          {
            defaultMessage: 'To',
          }
        )}
      >
        <EuiComboBox
          noSuggestions
          isInvalid={hasErrors && to !== undefined}
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
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        error={errors.cc}
        isInvalid={hasErrors && cc !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientCopyTextFieldLabel',
          {
            defaultMessage: 'Cc',
          }
        )}
      >
        <EuiComboBox
          noSuggestions
          isInvalid={hasErrors && cc !== undefined}
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
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        error={errors.bcc}
        isInvalid={hasErrors && bcc !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientBccTextFieldLabel',
          {
            defaultMessage: 'Bcc',
          }
        )}
      >
        <EuiComboBox
          noSuggestions
          isInvalid={hasErrors && bcc !== undefined}
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
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        error={errors.subject}
        isInvalid={hasErrors && message !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.subjectTextFieldLabel',
          {
            defaultMessage: 'Subject',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          isInvalid={hasErrors && message !== undefined}
          name="subject"
          data-test-subj="emailSubjectInput"
          value={subject || ''}
          onChange={e => {
            editAction('subject', e.target.value, index);
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        error={errors.message}
        isInvalid={hasErrors && message !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
      >
        <EuiTextArea
          fullWidth
          isInvalid={hasErrors && message !== undefined}
          value={message || ''}
          name="message"
          data-test-subj="emailMessageInput"
          onChange={e => {
            editAction('message', e.target.value, index);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
