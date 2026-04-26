/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
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

import { ALL_DATA_SOURCE_TYPES } from '../common';
import type { DataSourceType } from '../common/datasource_types';
import { getDataSourceTypeLabel } from './get_data_source_type_label';

export interface CreateDataSourceFlyoutProps {
  onClose: () => void;
  /**
   * Persist a new data source. Resolve `null` on success, or an error message to show in the flyout.
   */
  onSave: (values: {
    name: string;
    description: string;
    type: DataSourceType;
  }) => Promise<string | null>;
}

export const CreateDataSourceFlyout: FunctionComponent<CreateDataSourceFlyoutProps> = ({
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dataSourceType, setDataSourceType] = useState<DataSourceType>('s3');
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
      setNameError(
        i18n.translate('dataSourceManagement.createFlyout.nameRequired', {
          defaultMessage: 'Name is required.',
        })
      );
      return;
    }
    setNameError(undefined);
    setSaveError(undefined);
    setIsSaving(true);
    try {
      const message = await onSave({
        name: trimmedName,
        description: description.trim(),
        type: dataSourceType,
      });
      if (message) {
        setSaveError(message);
      } else {
        setName('');
        setDescription('');
        setDataSourceType('s3');
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }, [dataSourceType, description, name, onClose, onSave]);

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
          <h2 id="createDataSourceFlyoutTitle">
            {i18n.translate('dataSourceManagement.createFlyout.title', {
              defaultMessage: 'Add data source',
            })}
          </h2>
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
          <EuiFormRow
            label={i18n.translate('dataSourceManagement.createFlyout.typeLabel', {
              defaultMessage: 'Type',
            })}
            fullWidth
          >
            <EuiSelect
              options={dataSourceTypeOptions}
              value={dataSourceType}
              onChange={(e) => setDataSourceType(e.target.value as DataSourceType)}
              data-test-subj="createDataSourceFlyoutType"
              fullWidth
              aria-label={i18n.translate('dataSourceManagement.createFlyout.typeAriaLabel', {
                defaultMessage: 'Data source type',
              })}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('dataSourceManagement.createFlyout.nameLabel', {
              defaultMessage: 'Name',
            })}
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
          <EuiFormRow
            label={i18n.translate('dataSourceManagement.createFlyout.descriptionLabel', {
              defaultMessage: 'Description',
            })}
            fullWidth
          >
            <EuiTextArea
              name="dataSourceDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-test-subj="createDataSourceFlyoutDescription"
              fullWidth
              rows={4}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty data-test-subj="createDataSourceFlyoutCancel" onClick={onClose}>
          {i18n.translate('dataSourceManagement.createFlyout.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          type="button"
          data-test-subj="createDataSourceFlyoutSubmit"
          onClick={() => void handleSave()}
          isLoading={isSaving}
          disabled={isSaving}
        >
          {i18n.translate('dataSourceManagement.createFlyout.saveButton', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
