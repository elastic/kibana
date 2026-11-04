/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useRef } from 'react';
import { EuiFieldText, EuiFormRow, EuiSelect, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import type { BuildConnectorFormData, ConnectorTypeAuthType } from '../types';
import { toConnectorTypeId } from '../lib/form_serializers';

const authTypeOptions: Array<{ value: ConnectorTypeAuthType; text: string }> = [
  {
    value: 'none',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.authType.none', {
      defaultMessage: 'None',
    }),
  },
  {
    value: 'basic',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.authType.basic', {
      defaultMessage: 'Basic',
    }),
  },
  {
    value: 'bearer',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.authType.bearer', {
      defaultMessage: 'Bearer token',
    }),
  },
  {
    value: 'api_key_header',
    text: i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorPage.authType.apiKeyHeader',
      { defaultMessage: 'API key header' }
    ),
  },
];

/** Name, ID, description and authentication of the connector type. */
const ConnectorDetailsFieldsComponent: React.FC = () => {
  const { control, setValue } = useFormContext<BuildConnectorFormData>();
  const { isSubmitted } = useFormState({ control });
  const [displayName, id, authType] = useWatch({
    control,
    name: ['displayName', 'id', 'auth.type'],
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
      <Controller
        name="auth.type"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.authTypeFieldLabel',
              { defaultMessage: 'Authentication' }
            )}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiSelect
              fullWidth
              isInvalid={!!error}
              options={authTypeOptions}
              data-test-subj="buildConnectorAuthTypeSelect"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              inputRef={field.ref}
            />
          </EuiFormRow>
        )}
      />
      {authType === 'api_key_header' && (
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
