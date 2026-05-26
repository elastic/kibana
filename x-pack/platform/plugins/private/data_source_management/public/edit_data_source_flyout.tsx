/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import { ALL_DATA_SOURCE_TYPES } from '../common';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout_i18n';
import { emptyCreateDataSourceFlyoutFormSettings } from './create_data_source_flyout_form_state';
import { CreateDataSourceFlyoutTypeSettingsBlock } from './create_data_source_flyout_type_settings';
import {
  dataSourcePreviewFlyoutStrings,
  dataSourcePreviewPageStrings,
} from './data_source_preview_flyout_i18n';
import { getDataSourceTypeLabel } from './get_data_source_type_label';
import { persistedDataSourceToFormSettings } from './persisted_data_source_to_form_settings';

export interface EditDataSourceFlyoutProps {
  source: DataSourceListItem;
  onClose: () => void;
  onSave: (description: string) => Promise<void>;
  /** Deletes the source after confirmation in the parent. Parent closes the flyout on success. */
  onDelete: () => Promise<void>;
}

export const EditDataSourceFlyout: FunctionComponent<EditDataSourceFlyoutProps> = ({
  source,
  onClose,
  onSave,
  onDelete,
}) => {
  const titleId = 'editDataSourceFlyoutTitle';
  const [description, setDescription] = useState(source.description);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  useEffect(() => {
    setDescription(source.description);
  }, [source.description]);

  const readOnlyFormSettings = useMemo(() => {
    if (!source.persistedConfig) {
      return emptyCreateDataSourceFlyoutFormSettings();
    }
    return persistedDataSourceToFormSettings(source.persistedConfig);
  }, [source.persistedConfig]);

  const dataSourceTypeOptions = useMemo(
    () =>
      ALL_DATA_SOURCE_TYPES.map((value) => ({
        value,
        text: getDataSourceTypeLabel(value),
      })),
    []
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(description.trim());
    } finally {
      setIsSaving(false);
    }
  }, [description, onSave]);

  const handleDelete = useCallback(async () => {
    setDeleteError(undefined);
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      data-test-subj="editDataSourceFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{source.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {deleteError ? (
          <>
            <EuiText color="danger" size="s" data-test-subj="editDataSourceFlyoutDeleteError">
              {deleteError}
            </EuiText>
            <EuiSpacer size="m" />
          </>
        ) : null}
        <EuiForm component="div">
          <EuiFormRow label={createDataSourceFlyoutStrings.typeLabel()} fullWidth>
            <EuiSelect
              options={dataSourceTypeOptions}
              value={source.type}
              disabled
              data-test-subj="editDataSourceFlyoutType"
              fullWidth
              aria-label={createDataSourceFlyoutStrings.typeAriaLabel()}
            />
          </EuiFormRow>
          <EuiFormRow label={createDataSourceFlyoutStrings.nameLabel()} fullWidth>
            <EuiFieldText
              value={source.name}
              disabled
              data-test-subj="editDataSourceFlyoutName"
              fullWidth
              autoComplete="off"
            />
          </EuiFormRow>
          <EuiFormRow label={createDataSourceFlyoutStrings.descriptionLabel()} fullWidth>
            <EuiTextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-test-subj="editDataSourceFlyoutDescription"
              fullWidth
              rows={5}
              disabled={isSaving || isDeleting}
              aria-label={createDataSourceFlyoutStrings.descriptionLabel()}
            />
          </EuiFormRow>
          <CreateDataSourceFlyoutTypeSettingsBlock
            dataSourceType={source.type}
            formSettings={readOnlyFormSettings}
            onFormSettingsChange={() => {}}
            disabled
          />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              data-test-subj="editDataSourceFlyoutClose"
              onClick={onClose}
              disabled={isSaving || isDeleting}
            >
              {dataSourcePreviewFlyoutStrings.closeButton()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="danger"
                  data-test-subj="editDataSourceFlyoutDelete"
                  onClick={() => void handleDelete()}
                  isLoading={isDeleting}
                  disabled={isSaving || isDeleting}
                >
                  {dataSourcePreviewPageStrings.editSourceFlyoutDelete()}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  data-test-subj="editDataSourceFlyoutSave"
                  onClick={() => void handleSave()}
                  isLoading={isSaving}
                  disabled={isSaving || isDeleting}
                >
                  {dataSourcePreviewPageStrings.editSourceFlyoutSave()}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
