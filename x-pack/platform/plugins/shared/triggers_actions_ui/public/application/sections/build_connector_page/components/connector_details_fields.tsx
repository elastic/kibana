/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import {
  EuiCheckbox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import type { BuildConnectorFormData, ConnectorTypeAuthType } from '../types';
import { toConnectorTypeId } from '../lib/form_serializers';
import { ConnectorLogoField } from './connector_logo_field';

const authTypeOptions: ReadonlyArray<{
  value: ConnectorTypeAuthType;
  label: string;
  description: string;
}> = [
  {
    value: 'none',
    label: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.authType.none', {
      defaultMessage: 'None',
    }),
    description: i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorPage.authType.noneDescription',
      { defaultMessage: 'No credentials, for public APIs.' }
    ),
  },
  {
    value: 'basic',
    label: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.authType.basic', {
      defaultMessage: 'Basic',
    }),
    description: i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorPage.authType.basicDescription',
      { defaultMessage: 'Username and password.' }
    ),
  },
  {
    value: 'bearer',
    label: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.authType.bearer', {
      defaultMessage: 'Bearer token',
    }),
    description: i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorPage.authType.bearerDescription',
      { defaultMessage: 'A token sent in the Authorization header.' }
    ),
  },
  {
    value: 'api_key_header',
    label: i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorPage.authType.apiKeyHeader',
      { defaultMessage: 'API key header' }
    ),
    description: i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorPage.authType.apiKeyHeaderDescription',
      { defaultMessage: 'A key sent in a header you name.' }
    ),
  },
];

const detailsCellCss = css({ minWidth: 240 });
// Lines the nested field up with the checkbox label (checkbox 16px + 8px gap).
const nestedFieldCss = css({ paddingLeft: 24, paddingBottom: 4 });
const authListCss = css({ display: 'flex', flexDirection: 'column', gap: 8 });

/** Name, ID, description and authentication of the connector type. */
const ConnectorDetailsFieldsComponent: React.FC<{ metadataOnly?: boolean }> = ({
  metadataOnly = false,
}) => {
  const { control, setValue } = useFormContext<BuildConnectorFormData>();
  const { isSubmitted } = useFormState({ control });
  const [displayName, id] = useWatch({
    control,
    name: ['displayName', 'id'],
  });
  const previousDisplayName = useRef<string>(displayName ?? '');

  // Keep the ID in sync with the name until the user customizes it, mirroring the connector form.
  useEffect(() => {
    if (metadataOnly) return;
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
  }, [displayName, id, isSubmitted, metadataOnly, setValue]);

  return (
    <>
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" wrap>
        <EuiFlexItem css={detailsCellCss}>
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
        </EuiFlexItem>
        <EuiFlexItem css={detailsCellCss}>
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
                  {
                    defaultMessage:
                      'A unique identifier derived from the name. You can customize it.',
                  }
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
                  disabled={metadataOnly}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
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
        render={({ field, fieldState: { error } }) => {
          const selected = field.value ?? [];
          const toggle = (value: ConnectorTypeAuthType) =>
            field.onChange(
              selected.includes(value)
                ? selected.filter((type) => type !== value)
                : authTypeOptions.flatMap(({ value: option }) =>
                    option === value || selected.includes(option) ? [option] : []
                  )
            );

          return (
            <EuiFormRow
              labelType="legend"
              label={i18n.translate(
                'xpack.triggersActionsUI.sections.buildConnectorPage.authTypeFieldLabel',
                { defaultMessage: 'Authentication' }
              )}
              helpText={i18n.translate(
                'xpack.triggersActionsUI.sections.buildConnectorPage.authTypeFieldHelpText',
                {
                  defaultMessage:
                    'Select one or more. With more than one, users pick a method when they create a connector.',
                }
              )}
              fullWidth
              isInvalid={!!error}
              error={error?.message}
              data-test-subj="buildConnectorAuthTypeSelect"
            >
              <div css={authListCss}>
                {authTypeOptions.map(({ value, label, description }) => {
                  const isChecked = selected.includes(value);
                  return (
                    <React.Fragment key={value}>
                      <EuiCheckbox
                        id={`buildConnectorAuthType-${value}`}
                        label={
                          <>
                            {label}
                            <EuiText size="xs" color="subdued">
                              {description}
                            </EuiText>
                          </>
                        }
                        checked={isChecked}
                        disabled={metadataOnly}
                        onChange={() => toggle(value)}
                        onBlur={field.onBlur}
                        data-test-subj={`buildConnectorAuthType-${value}`}
                      />
                      {value === 'api_key_header' && isChecked && (
                        <div css={nestedFieldCss}>
                          <Controller
                            name="auth.headerName"
                            control={control}
                            render={({
                              field: headerField,
                              fieldState: { error: headerError },
                            }) => (
                              <EuiFormRow
                                label={i18n.translate(
                                  'xpack.triggersActionsUI.sections.buildConnectorPage.headerNameFieldLabel',
                                  { defaultMessage: 'API key header name' }
                                )}
                                display="rowCompressed"
                                isInvalid={!!headerError}
                                error={headerError?.message}
                              >
                                <EuiFieldText
                                  compressed
                                  isInvalid={!!headerError}
                                  placeholder="X-API-Key"
                                  data-test-subj="buildConnectorAuthHeaderNameInput"
                                  value={headerField.value ?? ''}
                                  disabled={metadataOnly}
                                  onChange={(e) => headerField.onChange(e.target.value)}
                                  onBlur={headerField.onBlur}
                                  inputRef={headerField.ref}
                                />
                              </EuiFormRow>
                            )}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </EuiFormRow>
          );
        }}
      />
    </>
  );
};

export const ConnectorDetailsFields = memo(ConnectorDetailsFieldsComponent);
