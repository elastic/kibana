/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldPassword, EuiFieldText, EuiFormRow, EuiSwitch } from '@elastic/eui';

import type { UseFormUnregister } from 'react-hook-form';
import { type Control, useController } from 'react-hook-form';
import type { CreateDataSourceFlyoutFormValues } from './create_data_source_flyout_form_state';

export function CreateDataSourceFlyoutTypeSettingsJdbc({
  control,
  unregister,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: hostField } = useController({
    defaultValue: '',
    name: 'settings.host',
    control,
  });
  const { field: portField } = useController({
    defaultValue: '',
    name: 'settings.port',
    control,
  });
  const { field: databaseField } = useController({
    defaultValue: '',
    name: 'settings.database',
    control,
  });
  const { field: sslField } = useController({
    defaultValue: false,
    name: 'settings.ssl',
    control,
  });
  const { field: usernameField } = useController({
    defaultValue: '',
    name: 'settings.username',
    control,
  });
  const { field: passwordField } = useController({
    defaultValue: '',
    name: 'settings.password',
    control,
  });

  const hostInvalid = !String(hostField.value ?? '').trim();
  const portInvalid = !String(portField.value ?? '').trim();
  const databaseInvalid = !String(databaseField.value ?? '').trim();

  useEffect(() => {
    return () => {
      unregister('settings.host');
      unregister('settings.port');
      unregister('settings.database');
      unregister('settings.ssl');
      unregister('settings.username');
      unregister('settings.password');
    };
  }, [unregister]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.jdbc.fields.host', {
          defaultMessage: 'Host',
        })}
        isInvalid={hostInvalid}
        error={
          hostInvalid
            ? i18n.translate('dataSets.createFlyout.jdbc.fields.hostRequired', {
                defaultMessage: 'Host is required.',
              })
            : undefined
        }
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutJdbcHost"
          fullWidth
          isInvalid={hostInvalid}
          autoComplete="off"
          value={hostField.value}
          onChange={(e) => hostField.onChange(e.target.value)}
          name={hostField.name}
          inputRef={hostField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.jdbc.fields.port', {
          defaultMessage: 'Port',
        })}
        isInvalid={portInvalid}
        error={
          portInvalid
            ? i18n.translate('dataSets.createFlyout.jdbc.fields.portRequired', {
                defaultMessage: 'Port is required.',
              })
            : undefined
        }
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutJdbcPort"
          fullWidth
          isInvalid={portInvalid}
          autoComplete="off"
          value={portField.value}
          onChange={(e) => portField.onChange(e.target.value)}
          name={portField.name}
          inputRef={portField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.jdbc.fields.database', {
          defaultMessage: 'Database',
        })}
        isInvalid={databaseInvalid}
        error={
          databaseInvalid
            ? i18n.translate('dataSets.createFlyout.jdbc.fields.databaseRequired', {
                defaultMessage: 'Database is required.',
              })
            : undefined
        }
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutJdbcDatabase"
          fullWidth
          isInvalid={databaseInvalid}
          autoComplete="off"
          value={databaseField.value}
          onChange={(e) => databaseField.onChange(e.target.value)}
          name={databaseField.name}
          inputRef={databaseField.ref}
        />
      </EuiFormRow>
      <EuiFormRow hasChildLabel hasEmptyLabelSpace fullWidth>
        <EuiSwitch
          label={i18n.translate('dataSets.createFlyout.jdbc.fields.ssl', {
            defaultMessage: 'SSL',
          })}
          checked={Boolean(sslField.value)}
          onChange={(e) => sslField.onChange(e.target.checked)}
          data-test-subj="createDataSourceFlyoutJdbcSsl"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.jdbc.fields.username', {
          defaultMessage: 'Username',
        })}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutJdbcUsername"
          fullWidth
          autoComplete="off"
          value={usernameField.value}
          onChange={(e) => usernameField.onChange(e.target.value)}
          name={usernameField.name}
          inputRef={usernameField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.jdbc.fields.password', {
          defaultMessage: 'Password',
        })}
        fullWidth
      >
        <EuiFieldPassword
          type="dual"
          data-test-subj="createDataSourceFlyoutJdbcPassword"
          fullWidth
          autoComplete="off"
          value={passwordField.value}
          onChange={(e) => passwordField.onChange(e.target.value)}
          name={passwordField.name}
          inputRef={passwordField.ref}
        />
      </EuiFormRow>
    </>
  );
}
