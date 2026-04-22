/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useState } from 'react';
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
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';

export interface CreateDataSourceFlyoutProps {
  onClose: () => void;
  /**
   * Persist a new data source. Resolve `null` on success, or an error message to show in the flyout.
   */
  onSave: (values: { name: string; description: string }) => Promise<string | null>;
}

export const CreateDataSourceFlyout: FunctionComponent<CreateDataSourceFlyoutProps> = ({
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

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
      const message = await onSave({ name: trimmedName, description: description.trim() });
      if (message) {
        setSaveError(message);
      } else {
        setName('');
        setDescription('');
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }, [description, name, onClose, onSave]);

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
            label={i18n.translate('dataSourceManagement.createFlyout.nameLabel', {
              defaultMessage: 'Name',
            })}
            isInvalid={Boolean(nameError)}
            error={nameError}
          >
            <EuiFieldText
              name="dataSourceName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isInvalid={Boolean(nameError)}
              data-test-subj="createDataSourceFlyoutName"
              autoFocus
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('dataSourceManagement.createFlyout.descriptionLabel', {
              defaultMessage: 'Description',
            })}
          >
            <EuiTextArea
              name="dataSourceDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-test-subj="createDataSourceFlyoutDescription"
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
