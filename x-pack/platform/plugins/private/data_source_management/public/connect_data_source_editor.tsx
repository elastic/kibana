/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';

import type { DataSourceWithSecrets } from '../common';
import { ALL_DATA_SOURCE_TYPES } from '../common';
import type { DataSourceType } from '../common/datasource_types';
import { buildOmitIdDataSource } from './build_create_data_source_payload';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout_i18n';
import {
  emptyCreateDataSourceFormSettings,
  type CreateDataSourceFlyoutFormSettings,
} from './create_data_source_flyout_form_state';
import { CreateDataSourceFlyoutTypeSettingsBlock } from './create_data_source_flyout_type_settings';
import { getDataSourceTypeLabel } from './get_data_source_type_label';

export interface ConnectDataSourceFormProps {
  variant: 'flyout' | 'page';
  onCancel: () => void;
  /**
   * Called after a successful save (form is reset first for flyout; page navigates away).
   */
  onCompleted: () => void;
  /**
   * Persist a new data source. Resolve `null` on success, or an error message to show.
   */
  onSave: (values: {
    name: string;
    dataSource: Omit<DataSourceWithSecrets, 'id'>;
  }) => Promise<string | null>;
}

export interface ConnectDataSourceFormParts {
  form: ReactNode;
  footerActions: ReactNode;
}

/**
 * Shared connect flow: form body + footer actions. Use with `EuiFlyoutBody` / `EuiFlyoutFooter`
 * or a full page layout.
 */
export function useConnectDataSourceFormParts({
  variant,
  onCancel,
  onCompleted,
  onSave,
}: ConnectDataSourceFormProps): ConnectDataSourceFormParts {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dataSourceType, setDataSourceType] = useState<DataSourceType>('s3');
  const [formSettings, setFormSettings] = useState<CreateDataSourceFlyoutFormSettings>(
    emptyCreateDataSourceFormSettings
  );
  const [nameError, setNameError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const dataSourceTypeOptions = useMemo(
    () =>
      ALL_DATA_SOURCE_TYPES.map((value) => ({
        value,
        text: getDataSourceTypeLabel(value),
      })),
    []
  );

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(createDataSourceFlyoutStrings.nameRequired());
      return;
    }
    setNameError(undefined);
    setSaveError(undefined);
    setIsSaving(true);
    try {
      const built = buildOmitIdDataSource(trimmedName, description, dataSourceType, formSettings);
      if (!('dataSource' in built)) {
        setSaveError(built.message);
        return;
      }
      const { dataSource } = built;
      const message = await onSave({ name: trimmedName, dataSource });
      if (message) {
        setSaveError(message);
      } else {
        setName('');
        setDescription('');
        setDataSourceType('s3');
        setFormSettings(emptyCreateDataSourceFormSettings());
        onCompleted();
      }
    } finally {
      setIsSaving(false);
    }
  }, [dataSourceType, description, formSettings, name, onCompleted, onSave]);

  const form = (
    <EuiForm component="form" id="createDataSourceForm" onSubmit={(e) => e.preventDefault()}>
      {saveError ? (
        <>
          <EuiText color="danger" size="s" data-test-subj="createDataSourceFlyoutSaveError">
            {saveError}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      ) : null}
      <EuiFormRow label={createDataSourceFlyoutStrings.typeLabel()} fullWidth>
        <EuiSelect
          options={dataSourceTypeOptions}
          value={dataSourceType}
          onChange={(e) => setDataSourceType(e.target.value as DataSourceType)}
          data-test-subj="createDataSourceFlyoutType"
          fullWidth
          aria-label={createDataSourceFlyoutStrings.typeAriaLabel()}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDataSourceFlyoutStrings.nameLabel()}
        isInvalid={Boolean(nameError)}
        error={nameError}
        fullWidth
      >
        <EuiFieldText
          name="dataSourceName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          isInvalid={Boolean(nameError)}
          data-test-subj="createDataSourceFlyoutName"
          autoFocus={variant === 'flyout'}
          fullWidth
        />
      </EuiFormRow>
      <EuiFormRow label={createDataSourceFlyoutStrings.descriptionLabel()} fullWidth>
        <EuiTextArea
          name="dataSourceDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          data-test-subj="createDataSourceFlyoutDescription"
          fullWidth
          rows={4}
        />
      </EuiFormRow>
      <CreateDataSourceFlyoutTypeSettingsBlock
        dataSourceType={dataSourceType}
        formSettings={formSettings}
        onFormSettingsChange={setFormSettings}
      />
    </EuiForm>
  );

  const footerActions = (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty flush="left" data-test-subj="createDataSourceFlyoutClose" onClick={onCancel}>
          {variant === 'page'
            ? createDataSourceFlyoutStrings.pageCancelButton()
            : createDataSourceFlyoutStrings.closeButton()}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          type="button"
          data-test-subj="createDataSourceFlyoutSubmit"
          onClick={() => void handleSave()}
          isLoading={isSaving}
          disabled={isSaving}
        >
          {createDataSourceFlyoutStrings.saveButton()}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return { form, footerActions };
}

export const ConnectDataSourceEditor: FunctionComponent<ConnectDataSourceFormProps> = (props) => {
  const { form, footerActions } = useConnectDataSourceFormParts(props);
  return (
    <>
      {form}
      <EuiSpacer size="l" />
      {footerActions}
    </>
  );
};
