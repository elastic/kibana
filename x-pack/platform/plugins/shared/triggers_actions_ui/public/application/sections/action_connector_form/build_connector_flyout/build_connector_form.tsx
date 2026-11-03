/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useRef } from 'react';
import { EuiFieldText, EuiFormRow, EuiSelect, EuiSpacer, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import type { BuildConnectorFormData, ConnectorTypeAuthType } from './types';
import { toConnectorTypeId } from './form_serializers';
import { FieldListEditor } from './field_list_editor';
import { ActionListEditor } from './action_list_editor';

const authTypeOptions: Array<{ value: ConnectorTypeAuthType; text: string }> = [
  {
    value: 'none',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.authType.none', {
      defaultMessage: 'None',
    }),
  },
  {
    value: 'basic',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.authType.basic', {
      defaultMessage: 'Basic',
    }),
  },
  {
    value: 'bearer',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.authType.bearer', {
      defaultMessage: 'Bearer token',
    }),
  },
  {
    value: 'api_key_header',
    text: i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorFlyout.authType.apiKeyHeader',
      { defaultMessage: 'API key header' }
    ),
  },
];

/** Explains the `config` object; shown on the info icon of the config field list. */
const CONFIG_TOOLTIP = (
  <p>
    <FormattedMessage
      id="xpack.triggersActionsUI.sections.buildConnectorFlyout.configTooltip"
      defaultMessage="The {config} object. Its fields are entered once, when a user creates a connector of this type, for example a base URL, and are available in every action's request as {example}."
      values={{ config: <code>config</code>, example: <code>{'{{config.<name>}}'}</code> }}
    />
  </p>
);

const CONFIG_DESCRIPTION = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.buildConnectorFlyout.configDescription"
    defaultMessage="Entered when a connector of this type is created. Use as {example}."
    values={{ example: <code>{'{{config.<name>}}'}</code> }}
  />
);

const BuildConnectorFormComponent: React.FC = () => {
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
              'xpack.triggersActionsUI.sections.buildConnectorFlyout.nameFieldLabel',
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
              'xpack.triggersActionsUI.sections.buildConnectorFlyout.idFieldLabel',
              { defaultMessage: 'Connector type ID' }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorFlyout.idFieldHelpText',
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
              'xpack.triggersActionsUI.sections.buildConnectorFlyout.descriptionFieldLabel',
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
              'xpack.triggersActionsUI.sections.buildConnectorFlyout.authTypeFieldLabel',
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
                'xpack.triggersActionsUI.sections.buildConnectorFlyout.headerNameFieldLabel',
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
      <EuiSpacer size="l" />
      <FieldListEditor
        name="config"
        title={i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.configTitle', {
          defaultMessage: 'Config',
        })}
        description={CONFIG_DESCRIPTION}
        tooltipContent={CONFIG_TOOLTIP}
        addButtonLabel={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorFlyout.addConfigFieldButtonLabel',
          { defaultMessage: 'Add config field' }
        )}
        testSubjPrefix="buildConnectorConfigFields"
      />
      <EuiSpacer size="l" />
      <ActionListEditor />
    </>
  );
};

export const BuildConnectorForm = memo(BuildConnectorFormComponent);
