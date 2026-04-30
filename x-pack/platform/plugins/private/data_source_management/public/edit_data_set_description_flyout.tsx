/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
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
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';

import type { DataSetListItem } from '../common/sample_data_sets_client';
import { addDataSetFlyoutStrings } from './add_data_set_flyout_i18n';
import { editDataSetDescriptionFlyoutStrings } from './edit_data_set_description_flyout_i18n';
import { dataSourcePreviewFlyoutStrings } from './data_source_preview_flyout_i18n';

export interface EditDataSetDescriptionFlyoutProps {
  dataSet: DataSetListItem;
  onClose: () => void;
  /** Resolve `null` on success, or an error message to display in the flyout. */
  onSave: (description: string) => Promise<string | null>;
}

export const EditDataSetDescriptionFlyout: FunctionComponent<EditDataSetDescriptionFlyoutProps> = ({
  dataSet,
  onClose,
  onSave,
}) => {
  const titleId = 'editDataSetDescriptionFlyoutTitle';
  const [description, setDescription] = useState(dataSet.description);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDescription(dataSet.description);
    setSaveError(undefined);
  }, [dataSet.description, dataSet.id]);

  const handleSave = useCallback(async () => {
    setSaveError(undefined);
    setIsSaving(true);
    try {
      const message = await onSave(description);
      if (message) {
        setSaveError(message);
      }
    } finally {
      setIsSaving(false);
    }
  }, [description, onSave]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      data-test-subj="editDataSetDescriptionFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{editDataSetDescriptionFlyoutStrings.title(dataSet.name)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" id="editDataSetDescriptionForm" onSubmit={(e) => e.preventDefault()}>
          {saveError ? (
            <>
              <EuiText color="danger" size="s" data-test-subj="editDataSetDescriptionFlyoutSaveError">
                {saveError}
              </EuiText>
              <EuiSpacer size="m" />
            </>
          ) : null}
          <EuiFormRow label={editDataSetDescriptionFlyoutStrings.datasetIdLabel()} fullWidth>
            <EuiFieldText
              value={dataSet.name}
              readOnly
              fullWidth
              data-test-subj="editDataSetDescriptionFlyoutDatasetId"
              aria-label={editDataSetDescriptionFlyoutStrings.datasetIdLabel()}
            />
          </EuiFormRow>
          <EuiFormRow label={editDataSetDescriptionFlyoutStrings.sourceLabel()} fullWidth>
            <EuiFieldText
              value={dataSet.sourceName}
              readOnly
              fullWidth
              data-test-subj="editDataSetDescriptionFlyoutSource"
              aria-label={editDataSetDescriptionFlyoutStrings.sourceLabel()}
            />
          </EuiFormRow>
          <EuiFormRow label={editDataSetDescriptionFlyoutStrings.resourceLabel()} fullWidth>
            <EuiFieldText
              value={dataSet.resource}
              readOnly
              fullWidth
              data-test-subj="editDataSetDescriptionFlyoutResource"
              aria-label={editDataSetDescriptionFlyoutStrings.resourceLabel()}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={addDataSetFlyoutStrings.descriptionLabel()}
            helpText={addDataSetFlyoutStrings.descriptionHelp()}
            fullWidth
          >
            <EuiTextArea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-test-subj="editDataSetDescriptionFlyoutDescription"
              fullWidth
              rows={4}
              aria-label={addDataSetFlyoutStrings.descriptionLabel()}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              data-test-subj="editDataSetDescriptionFlyoutCancel"
              onClick={onClose}
            >
              {dataSourcePreviewFlyoutStrings.closeButton()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              type="button"
              data-test-subj="editDataSetDescriptionFlyoutSave"
              onClick={() => void handleSave()}
              isLoading={isSaving}
            >
              {editDataSetDescriptionFlyoutStrings.saveButton()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
