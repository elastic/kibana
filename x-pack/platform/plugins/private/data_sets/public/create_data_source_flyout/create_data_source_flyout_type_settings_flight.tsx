/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import type { UseFormUnregister } from 'react-hook-form';
import { type Control, useController } from 'react-hook-form';
import type { CreateDataSourceFlyoutFormValues } from './create_data_source_flyout_form_state';

export function CreateDataSourceFlyoutTypeSettingsFlight({
  control,
  unregister,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: hostField } = useController({
    name: 'settings.host',
    control,
  });
  const { field: portField } = useController({
    name: 'settings.port',
    control,
  });

  const hostInvalid = !String(hostField.value ?? '').trim();

  const portDisplay =
    portField.value === undefined || portField.value === null ? '' : String(portField.value);

  const onPortChange = (raw: string) => {
    const t = raw.trim();
    if (!t) {
      portField.onChange(undefined);
      return;
    }
    const n = Number(t);
    if (Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 65535) {
      portField.onChange(n);
    } else {
      portField.onChange(undefined);
    }
  };

  useEffect(() => {
    return () => {
      unregister('settings.host');
      unregister('settings.port');
    };
  }, [unregister]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.flight.fields.host', {
          defaultMessage: 'Host',
        })}
        isInvalid={hostInvalid}
        error={
          hostInvalid
            ? i18n.translate('dataSets.createFlyout.flight.fields.hostRequired', {
                defaultMessage: 'Host is required.',
              })
            : undefined
        }
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutFlightHost"
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
        label={i18n.translate('dataSets.createFlyout.flight.fields.port', {
          defaultMessage: 'Port',
        })}
        helpText={i18n.translate('dataSets.createFlyout.flight.fields.portHelp', {
          defaultMessage: 'Optional. Must be a whole number between 1 and 65535.',
        })}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutFlightPort"
          fullWidth
          type="text"
          inputMode="numeric"
          placeholder={i18n.translate('dataSets.createFlyout.flight.fields.portOptional', {
            defaultMessage: 'Optional',
          })}
          autoComplete="off"
          value={portDisplay}
          onChange={(e) => onPortChange(e.target.value)}
          name={portField.name}
          inputRef={portField.ref}
        />
      </EuiFormRow>
    </>
  );
}
