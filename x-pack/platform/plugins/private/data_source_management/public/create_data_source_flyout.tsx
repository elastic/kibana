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
  EuiFlexGroup,
  EuiFlexItem,
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
  onSave: (values: {
    name: string;
    dataSource: Omit<DataSourceWithSecrets, 'id'>;
  }) => Promise<string | null>;
}

export const CreateDataSourceFlyout: FunctionComponent<CreateDataSourceFlyoutProps> = ({
  onClose,
  onSave,
}) => {
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
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }, [dataSourceType, description, formSettings, name, onClose, onSave]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="createDataSourceFlyoutTitle"
      size="m"
      data-test-subj="createDataSourceFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="createDataSourceFlyoutTitle">{createDataSourceFlyoutStrings.title()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
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
              autoFocus
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
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              data-test-subj="createDataSourceFlyoutClose"
              onClick={onClose}
            >
              {createDataSourceFlyoutStrings.closeButton()}
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
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
