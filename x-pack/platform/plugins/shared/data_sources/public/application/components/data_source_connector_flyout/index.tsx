/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, Suspense } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiIcon,
  EuiCallOut,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Form, useForm, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { UserConfiguredActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { DataSourceUIOverride } from '../../lib/data_source_ui_configs/types';

/**
 * Type alias for user-configured connectors with generic config and secrets.
 * Simplifies type annotations throughout the component.
 */
type GenericUserConnector = UserConfiguredActionConnector<
  Record<string, unknown>,
  Record<string, unknown>
>;

export interface DataSourceConnectorFlyoutProps {
  mode: 'create' | 'edit';
  uiOverride: DataSourceUIOverride;
  connector?: ActionConnector; // Existing connector for edit mode
  suggestedName?: string; // For create mode
  icon?: IconType;
  onSave: (serializedData: {
    actionTypeId: string;
    name: string;
    config: Record<string, unknown>;
    secrets: Record<string, unknown>;
  }) => Promise<void>; // Hook handles API call
  onClose: () => void;
  isSaving: boolean; // From hook
}

/**
 * Generic custom flyout for data sources with UI overrides.
 * This component handles BOTH create and edit modes for ALL branded data sources.
 */
export const DataSourceConnectorFlyout: React.FC<DataSourceConnectorFlyoutProps> = ({
  mode,
  uiOverride,
  connector,
  suggestedName,
  icon,
  onSave,
  onClose,
  isSaving,
}) => {
  const { emptyField } = fieldValidators;
  const [error, setError] = useState<string | null>(null);

  // Lazy load the custom form component
  const CustomForm = useMemo(
    () => React.lazy(uiOverride.formComponentImport),
    [uiOverride.formComponentImport]
  );

  // Prepare initial values based on mode
  const initialValue = useMemo(() => {
    if (mode === 'edit' && connector) {
      // Deserialize existing connector for edit
      // Cast to GenericUserConnector as we only support editing user-created connectors
      return uiOverride.deserializer(connector as GenericUserConnector);
    }
    // Default values for create
    // Use serializer to get proper defaults (e.g., serverUrl for GitHub)
    const emptyForm = {
      actionTypeId: '',
      isDeprecated: false,
      name: suggestedName || '',
      config: {},
      secrets: {},
    };
    // Serialize and deserialize to populate defaults
    const withDefaults = uiOverride.serializer(emptyForm);
    return {
      actionTypeId: withDefaults.actionTypeId || '',
      isDeprecated: false,
      name: emptyForm.name,
      config: withDefaults.config || {},
      secrets: {},
    };
  }, [mode, connector, suggestedName, uiOverride]);

  const { form } = useForm({
    defaultValue: initialValue,
  });

  const handleSubmit = useCallback(async () => {
    setError(null);

    try {
      const { isValid, data } = await form.submit();

      if (!isValid || !data) {
        return;
      }

      // Serialize the form data using the UI override's serializer
      const serializedData = uiOverride.serializer(data);

      await onSave({
        actionTypeId: serializedData.actionTypeId,
        name: serializedData.name || '',
        config: serializedData.config || {},
        secrets: serializedData.secrets || {},
      });
    } catch (e) {
      // Set error for display
      const errorMessage = (e as Error).message || 'An unexpected error occurred';
      setError(errorMessage);
    }
  }, [form, uiOverride, onSave]);

  // Dynamic title based on mode
  const title =
    mode === 'create'
      ? uiOverride.displayName
      : i18n.translate('xpack.dataSources.dataSourceConnectorFlyout.editTitle', {
          defaultMessage: 'Edit connector',
        });

  // Dynamic button text based on mode
  const saveButtonText =
    mode === 'create'
      ? i18n.translate('xpack.dataSources.dataSourceConnectorFlyout.saveButton', {
          defaultMessage: 'Save',
        })
      : i18n.translate('xpack.dataSources.dataSourceConnectorFlyout.saveChangesButton', {
          defaultMessage: 'Save changes',
        });

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby="dataSourceConnectorFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          {icon && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} size="xl" />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="dataSourceConnectorFlyoutTitle">{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {error && (
          <>
            <EuiCallOut announceOnMount title="Error" color="danger" iconType="cross">
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        <Form form={form}>
          {/* Connector Name Field */}
          <UseField
            path="name"
            component={TextField}
            config={{
              label: i18n.translate('xpack.dataSources.dataSourceConnectorFlyout.nameLabel', {
                defaultMessage: 'Connector name',
              }),
              helpText: i18n.translate('xpack.dataSources.dataSourceConnectorFlyout.nameHelpText', {
                defaultMessage: 'A unique name for this connector',
              }),
              validations: [
                {
                  validator: emptyField(
                    i18n.translate('xpack.dataSources.dataSourceConnectorFlyout.nameRequired', {
                      defaultMessage: 'Connector name is required',
                    })
                  ),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'data-source-connector-name-input',
                fullWidth: true,
                readOnly: isSaving,
              },
            }}
          />

          <EuiSpacer size="l" />

          {/* Connector Settings Section */}
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.dataSources.dataSourceConnectorFlyout.settingsTitle', {
                defaultMessage: 'Connector settings',
              })}
            </h4>
          </EuiTitle>

          <EuiSpacer size="m" />

          {/* Custom Form Component */}
          <Suspense fallback={<EuiLoadingSpinner size="l" />}>
            <CustomForm
              readOnly={isSaving}
              isEdit={mode === 'edit'}
              registerPreSubmitValidator={() => {}}
            />
          </Suspense>
        </Form>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} disabled={isSaving}>
              {i18n.translate('xpack.dataSources.dataSourceConnectorFlyout.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleSubmit}
              fill
              isLoading={isSaving}
              disabled={isSaving}
              data-test-subj="data-source-connector-save-button"
            >
              {saveButtonText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
