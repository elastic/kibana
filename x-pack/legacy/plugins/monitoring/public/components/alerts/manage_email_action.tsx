/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
  EuiSpacer,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiSwitch,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionResult } from '../../../../actions/server/types';
import { getMissingFieldErrors, hasErrors } from '../../lib/form_validation';

export interface EmailActionData {
  service: string;
  host: string;
  port: number | string; // support a string to ensure the user can backspace to an empty field
  secure: boolean;
  from: string;
  user: string;
  password: string;
}

interface ManageActionModalProps {
  createEmailAction: (handler: EmailActionData) => void;
  cancel?: () => void;
  isNew: boolean;
  action?: ActionResult | null;
}

const DEFAULT_DATA: EmailActionData = {
  service: '',
  host: '',
  port: 0,
  secure: false,
  from: '',
  user: '',
  password: '',
};

const CREATE_LABEL = i18n.translate('xpack.monitoring.alerts.migrate.manageAction.createLabel', {
  defaultMessage: 'Create email action',
});
const SAVE_LABEL = i18n.translate('xpack.monitoring.alerts.migrate.manageAction.saveLabel', {
  defaultMessage: 'Save email action',
});
const CANCEL_LABEL = i18n.translate('xpack.monitoring.alerts.migrate.manageAction.cancelLabel', {
  defaultMessage: 'Cancel',
});

export const ManageEmailAction: React.FC<ManageActionModalProps> = (
  props: ManageActionModalProps
) => {
  const { createEmailAction, cancel, isNew, action } = props;

  const defaultData = Object.assign({}, DEFAULT_DATA, action ? action.config : {});
  const [isSaving, setIsSaving] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [errors, setErrors] = React.useState<EmailActionData | any>(
    getMissingFieldErrors(defaultData, DEFAULT_DATA)
  );
  const [data, setData] = React.useState(defaultData);

  React.useEffect(() => {
    setErrors(getMissingFieldErrors(data, DEFAULT_DATA));
  }, [data]);

  async function saveEmailAction() {
    setShowErrors(true);
    if (!hasErrors(errors)) {
      setShowErrors(false);
      setIsSaving(true);
      try {
        await createEmailAction(data);
      } catch (err) {
        setErrors({
          general: err.body.message,
        });
      }
    }
  }

  return (
    <EuiForm isInvalid={showErrors} error={Object.values(errors)}>
      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.serviceText', {
          defaultMessage: 'Service',
        })}
        helpText={
          <EuiLink target="_blank" href="https://nodemailer.com/smtp/well-known/">
            {i18n.translate('xpack.monitoring.alerts.migrate.manageAction.serviceHelpText', {
              defaultMessage: 'Find out more',
            })}
          </EuiLink>
        }
        error={errors.service}
        isInvalid={showErrors && !!errors.service}
      >
        <EuiFieldText
          value={data.service}
          onChange={e => setData({ ...data, service: e.target.value })}
          isInvalid={showErrors}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.hostText', {
          defaultMessage: 'Host',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.hostHelpText', {
          defaultMessage: 'Host name of the service provider',
        })}
        error={errors.host}
        isInvalid={showErrors && !!errors.host}
      >
        <EuiFieldText
          value={data.host}
          onChange={e => setData({ ...data, host: e.target.value })}
          isInvalid={showErrors}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.portText', {
          defaultMessage: 'Port',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.portHelpText', {
          defaultMessage: 'Port number of the service provider',
        })}
        error={errors.port}
        isInvalid={showErrors && !!errors.port}
      >
        <EuiFieldNumber
          value={data.port}
          onChange={e => setData({ ...data, port: parseInt(e.target.value, 10) || '' })}
          isInvalid={showErrors}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.secureText', {
          defaultMessage: 'Secure',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.secureHelpText', {
          defaultMessage: 'Whether to use TLS with the service provider',
        })}
      >
        <EuiSwitch
          checked={data.secure}
          onChange={e => setData({ ...data, secure: e.target.checked })}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.fromText', {
          defaultMessage: 'From',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.fromHelpText', {
          defaultMessage: 'The from email address for alerts',
        })}
        error={errors.from}
        isInvalid={showErrors && !!errors.from}
      >
        <EuiFieldText
          value={data.from}
          onChange={e => setData({ ...data, from: e.target.value })}
          isInvalid={showErrors}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.userText', {
          defaultMessage: 'User',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.userHelpText', {
          defaultMessage: 'The user to use with the service provider',
        })}
        error={errors.user}
        isInvalid={showErrors && !!errors.user}
      >
        <EuiFieldText
          value={data.user}
          onChange={e => setData({ ...data, user: e.target.value })}
          isInvalid={showErrors}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.passwordText', {
          defaultMessage: 'Password',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.passwordHelpText', {
          defaultMessage: 'The password to use with the service provider',
        })}
        error={errors.password}
        isInvalid={showErrors && !!errors.password}
      >
        <EuiFieldPassword
          value={data.password}
          onChange={e => setData({ ...data, password: e.target.value })}
          isInvalid={showErrors}
        />
      </EuiFormRow>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton type="submit" fill onClick={saveEmailAction} isLoading={isSaving}>
            {isNew ? CREATE_LABEL : SAVE_LABEL}
          </EuiButton>
        </EuiFlexItem>
        {!action || isNew ? null : (
          <EuiFlexItem grow={false}>
            <EuiButton onClick={cancel}>{CANCEL_LABEL}</EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiForm>
  );
};
