/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useRef } from 'react';
import { EuiComboBox, EuiFieldText, EuiFormRow, EuiTextArea } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import type { BuildConnectorFormData, ConnectorTypeAuthType } from '../types';
import { toConnectorTypeId } from '../lib/form_serializers';
import { ConnectorLogoField } from './connector_logo_field';

const authTypeOptions: Array<EuiComboBoxOptionOption<ConnectorTypeAuthType>> = [
  {
    value: 'none',
    label: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.authType.none', {
      defaultMessage: 'None',
    }),
  },
  {
    value: 'basic',
    label: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.authType.basic', {
      defaultMessage: 'Basic',
    }),
  },
  {
    value: 'bearer',
    label: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.authType.bearer', {
      defaultMessage: 'Bearer token',
    }),
  },
  {
    value: 'api_key_header',
    label: i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorPage.authType.apiKeyHeader',
      { defaultMessage: 'API key header' }
    ),
  },
];

/** Name, ID, description and authentication of the connector type. */
const ConnectorDetailsFieldsComponent: React.FC = () => {
  const { control, setValue } = useFormContext<BuildConnectorFormData>();
  const { isSubmitted } = useFormState({ control });
  const [displayName, id, authTypes] = useWatch({
    control,
    name: ['displayName', 'id', 'auth.types'],
  });
  const previousDisplayName = useRef<string>(displayName ?? '');

  // Keep the ID in sync with the name until the user customizes it, mirroring the connector form.
  useEffect(() => {
    const expectedId = toConnectorTypeId(previousDisplayName.current);
    previousDisplayName.current = displayName ?? '';

    const isCustomId = (id ?? '') !== expectedId;
    if (isCustomId) {
      return;
    }

    const nextId = toConnectorTypeId(displayName ?? '');
    if (nextId !== (id ?? '')) {
      setValue('id', nextId, { shouldDirty: true, shouldValidate: isSubmitted });
    }
  }, [displayName, id, isSubmitted, setValue]);

  return (
    <>
      <Controller
        name="displayName"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.nameFieldLabel',
              { defaultMessage: 'Name' }
            )}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiFieldText
              fullWidth
              isInvalid={!!error}
              data-test-subj="buildConnectorNameInput"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              inputRef={field.ref}
            />
          </EuiFormRow>
        )}
      />
      <Controller
        name="id"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.idFieldLabel',
              { defaultMessage: 'Connector type ID' }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.idFieldHelpText',
              { defaultMessage: 'A unique identifier derived from the name. You can customize it.' }
            )}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiFieldText
              fullWidth
              isInvalid={!!error}
              data-test-subj="buildConnectorIdInput"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              inputRef={field.ref}
            />
          </EuiFormRow>
        )}
      />
      <Controller
        name="description"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.descriptionFieldLabel',
              { defaultMessage: 'Description' }
            )}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiTextArea
              fullWidth
              rows={3}
              isInvalid={!!error}
              data-test-subj="buildConnectorDescriptionInput"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              inputRef={field.ref}
            />
          </EuiFormRow>
        )}
      />
      <ConnectorLogoField />
      <Controller
        name="auth.types"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.authTypeFieldLabel',
              { defaultMessage: 'Authentication' }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.authTypeFieldHelpText',
              {
                defaultMessage:
                  'Pick one type, or several to let users choose how a connector authenticates.',
              }
            )}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiComboBox<ConnectorTypeAuthType>
              fullWidth
              isClearable={false}
              isInvalid={!!error}
              options={authTypeOptions}
              selectedOptions={authTypeOptions.filter(({ value }) =>
                (field.value ?? []).includes(value as ConnectorTypeAuthType)
              )}
              data-test-subj="buildConnectorAuthTypeSelect"
              onChange={(selected) =>
                field.onChange(
                  selected.flatMap(({ value }) => (value === undefined ? [] : [value]))
                )
              }
              onBlur={field.onBlur}
            />
          </EuiFormRow>
        )}
      />
      {authTypes?.includes('api_key_header') && (
        <Controller
          name="auth.headerName"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <EuiFormRow
              label={i18n.translate(
                'xpack.triggersActionsUI.sections.buildConnectorPage.headerNameFieldLabel',
                { defaultMessage: 'API key header name' }
              )}
              fullWidth
              isInvalid={!!error}
              error={error?.message}
            >
              <EuiFieldText
                fullWidth
                isInvalid={!!error}
                data-test-subj="buildConnectorAuthHeaderNameInput"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                inputRef={field.ref}
              />
            </EuiFormRow>
          )}
        />
      )}
    </>
  );
};

export const ConnectorDetailsFields = memo(ConnectorDetailsFieldsComponent);
