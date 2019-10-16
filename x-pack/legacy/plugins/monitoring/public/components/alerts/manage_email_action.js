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
  EuiButton
} from '@elastic/eui';
// import { i18n } from '@kbn/i18n';
import { getMissingFieldErrors, hasErrors } from '../../lib/form_validation';

const DEFAULT_DATA = {
  service: '',
  host: '',
  port: 0,
  secure: false,
  from: '',
  user: '',
  password: ''
};

export function ManageEmailAction({ createEmailAction, isNew, action }) {
  const defaultData = Object.assign(DEFAULT_DATA, action.config);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [errors, setErrors] = React.useState(getMissingFieldErrors(defaultData, DEFAULT_DATA));
  const [data, setData] = React.useState(defaultData);

  React.useEffect(() => {
    setErrors(getMissingFieldErrors(data, DEFAULT_DATA));
  }, [data]);

  function saveEmailAction() {
    setShowErrors(true);
    if (!hasErrors(errors)) {
      setShowErrors(false);
      setIsSaving(true);
      createEmailAction(data);
    }
  }

  return (
    <EuiForm isInvalid={showErrors} error={Object.values(errors)}>
      <EuiFormRow
        label="Service"
        helpText={<EuiLink target="_blank" href="https://nodemailer.com/smtp/well-known/">Find out more</EuiLink>}
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
        label="Host"
        helpText="Host name of the service provider"
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
        label="Port"
        helpText="Port number of the service provider"
        error={errors.port}
        isInvalid={showErrors && !!errors.port}
      >
        <EuiFieldNumber
          value={data.port}
          onChange={e => setData({ ...data, port: parseInt(e.target.value) || '' })}
          isInvalid={showErrors}
        />
      </EuiFormRow>

      <EuiFormRow
        label="Secure"
        helpText="Whether to use TLS with the service provider"
      >
        <EuiSwitch
          checked={data.secure}
          onChange={e => setData({ ...data, secure: e.target.checked })}
        />
      </EuiFormRow>

      <EuiFormRow
        label="From"
        helpText="The from email address for alerts"
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
        label="User"
        helpText="The user to use with the service provider"
        error={errors.user}
        isInvalid={showErrors && !!errors.user}
      >
        <EuiFieldText
          id="emailActionUser"
          value={data.user}
          onChange={e => setData({ ...data, user: e.target.value })}
          isInvalid={showErrors}
        />
      </EuiFormRow>

      <EuiFormRow
        label="Password"
        helpText="The password to use with the service provider"
        error={errors.password}
        isInvalid={showErrors && !!errors.password}
      >
        <EuiFieldPassword
          id="emailActionPasswrd"
          value={data.password}
          onChange={e => setData({ ...data, password: e.target.value })}
          isInvalid={showErrors}
        />
      </EuiFormRow>

      <EuiSpacer />

      <EuiButton type="submit" fill onClick={saveEmailAction} isLoading={isSaving}>
        { isNew ? 'Create' : 'Edit' } email action
      </EuiButton>
    </EuiForm>
  );
}
