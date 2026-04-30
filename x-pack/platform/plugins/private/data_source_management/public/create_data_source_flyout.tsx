/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { useController, useForm } from 'react-hook-form';
import { omit } from 'lodash';

import type { DataSourceWithSecrets } from '../common';
import { ALL_DATA_SOURCE_TYPES } from '../common';
import type { DataSourceType } from '../common/datasource_types';
import { buildOmitIdDataSource } from './build_create_data_source_payload';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout_i18n';
import { emptyCreateDataSourceFormSettings } from './create_data_source_flyout_form_state';
import type { CreateDataSourceFlyoutFormSettings } from './create_data_source_flyout_form_state';
import { CreateDataSourceFlyoutTypeSettingsBlock } from './create_data_source_flyout_type_settings';
import { getDataSourceTypeLabel } from './get_data_source_type_label';

export interface CreateDataSourceFlyoutProps {
  onClose: () => void;
  /**
   * Persist a new data source. Resolve `null` on success, or an error message to show in the flyout.
   */
  onSave: (data: DataSourceWithSecrets) => Promise<string | null>;
}

export const CreateDataSourceFlyout: FunctionComponent<CreateDataSourceFlyoutProps> = ({
  onClose,
  onSave,
}) => {
  const {
    handleSubmit,
    control,
    // formState: { errors },
  } = useForm<DataSourceWithSecrets>();

  const [formSettings, setFormSettings] = useState<CreateDataSourceFlyoutFormSettings>(
    emptyCreateDataSourceFormSettings
  );
  const [nameError, setNameError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const { field: dataSourceTypeField } = useController({
    defaultValue: 's3' as DataSourceType,
    name: 'type',
    control,
  });

  const { field: nameField } = useController({
    defaultValue: '',
    name: 'name',
    control,
    rules: {
      // todo will need to make sure this is unique
      // todo make sure this is displayed somewhere
      required: createDataSourceFlyoutStrings.nameRequired(),
    },
  });
  const { field: descriptionField } = useController({
    defaultValue: '',
    name: 'description',
    control,
  });

  const dataSourceTypeOptions = useMemo(
    () =>
      ALL_DATA_SOURCE_TYPES.map((value) => ({
        value,
        text: getDataSourceTypeLabel(value),
      })),
    []
  );

  /*
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
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }, [dataSourceType, description, formSettings, name, onClose, onSave]);
  */

  const handleSave = (data: DataSourceWithSecrets) => {
    console.log('form data', data);
    return onSave(data);
  };

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="createDataSourceFlyoutTitle"
      size="l"
      data-test-subj="createDataSourceFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="createDataSourceFlyoutTitle">{createDataSourceFlyoutStrings.title()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" id="createDataSourceForm" onSubmit={handleSubmit(handleSave)}>
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
              data-test-subj="createDataSourceFlyoutType"
              fullWidth
              aria-label={createDataSourceFlyoutStrings.typeAriaLabel()}
              value={dataSourceTypeField.value as DataSourceType}
              onChange={(e) => dataSourceTypeField.onChange(e.target.value as DataSourceType)}
              name={dataSourceTypeField.name}
              inputRef={dataSourceTypeField.ref}
            />
          </EuiFormRow>
          <EuiFormRow
            label={createDataSourceFlyoutStrings.nameLabel()}
            isInvalid={Boolean(nameError)}
            error={nameError}
            fullWidth
          >
            <EuiFieldText
              // todo
              isInvalid={Boolean(nameError)}
              data-test-subj="createDataSourceFlyoutName"
              autoFocus
              fullWidth
              value={nameField.value}
              onChange={(e) => nameField.onChange(e.target.value)}
              name={nameField.name}
              inputRef={nameField.ref}
            />
          </EuiFormRow>
          <EuiFormRow label={createDataSourceFlyoutStrings.descriptionLabel()} fullWidth>
            <EuiTextArea
              data-test-subj="createDataSourceFlyoutDescription"
              fullWidth
              rows={4}
              value={descriptionField.value}
              onChange={(e) => descriptionField.onChange(e.target.value)}
              name={descriptionField.name}
              inputRef={descriptionField.ref}
            />
          </EuiFormRow>
          <CreateDataSourceFlyoutTypeSettingsBlock
            control={control}
            dataSourceType={dataSourceTypeField.value as DataSourceType}
            formSettings={formSettings}
            onFormSettingsChange={setFormSettings}
          />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty data-test-subj="createDataSourceFlyoutCancel" onClick={onClose}>
          {createDataSourceFlyoutStrings.cancelButton()}
        </EuiButtonEmpty>
        <EuiButton
          fill
          type="submit"
          data-test-subj="createDataSourceFlyoutSubmit"
          onClick={handleSubmit(handleSave)}
          isLoading={isSaving}
          disabled={isSaving}
        >
          {createDataSourceFlyoutStrings.saveButton()}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
