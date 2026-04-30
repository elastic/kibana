/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
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

import type { DataSetPartitionDetection } from '../common/sample_data_sets_client';
import { addDataSetFlyoutStrings } from './add_data_set_flyout_i18n';
import { dataSourcePreviewFlyoutStrings } from './data_source_preview_flyout_i18n';

export interface AddDataSetFlyoutPayload {
  datasetId: string;
  resource: string;
  description: string;
  partitionDetection: DataSetPartitionDetection;
}

export interface AddDataSetFlyoutProps {
  sourceName: string;
  onClose: () => void;
  /** Resolve `null` on success, or an error message to display in the flyout. */
  onSave: (values: AddDataSetFlyoutPayload) => Promise<string | null>;
}

export const AddDataSetFlyout: FunctionComponent<AddDataSetFlyoutProps> = ({
  sourceName,
  onClose,
  onSave,
}) => {
  const titleId = 'addDataSetFlyoutTitle';
  const [datasetId, setDatasetId] = useState('');
  const [resource, setResource] = useState('');
  const [description, setDescription] = useState('');
  const [partitionDetection, setPartitionDetection] = useState<DataSetPartitionDetection>('none');
  const [datasetIdError, setDatasetIdError] = useState<string | undefined>();
  const [resourceError, setResourceError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const partitionOptions = useMemo(
    () => [
      { value: 'none', text: addDataSetFlyoutStrings.partitionOptionNone() },
      { value: 'hive', text: addDataSetFlyoutStrings.partitionOptionHive() },
    ],
    []
  );

  const handleSave = useCallback(async () => {
    const trimmedId = datasetId.trim();
    const trimmedResource = resource.trim();
    setDatasetIdError(undefined);
    setResourceError(undefined);
    setSaveError(undefined);

    if (!trimmedId) {
      setDatasetIdError(addDataSetFlyoutStrings.datasetIdRequired());
      return;
    }
    if (!trimmedResource) {
      setResourceError(addDataSetFlyoutStrings.resourceRequired());
      return;
    }

    setIsSaving(true);
    try {
      const message = await onSave({
        datasetId: trimmedId,
        resource: trimmedResource,
        description: description.trim(),
        partitionDetection,
      });
      if (message) {
        setSaveError(message);
      }
    } finally {
      setIsSaving(false);
    }
  }, [datasetId, description, onSave, partitionDetection, resource]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      data-test-subj="addDataSetFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{addDataSetFlyoutStrings.title(sourceName)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" id="addDataSetForm" onSubmit={(e) => e.preventDefault()}>
          {saveError ? (
            <>
              <EuiText color="danger" size="s" data-test-subj="addDataSetFlyoutSaveError">
                {saveError}
              </EuiText>
              <EuiSpacer size="m" />
            </>
          ) : null}
          <EuiFormRow
            label={addDataSetFlyoutStrings.datasetIdLabel()}
            helpText={addDataSetFlyoutStrings.datasetIdHelp()}
            isInvalid={Boolean(datasetIdError)}
            error={datasetIdError}
            fullWidth
          >
            <EuiFieldText
              name="datasetId"
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              isInvalid={Boolean(datasetIdError)}
              data-test-subj="addDataSetFlyoutDatasetId"
              autoFocus
              fullWidth
              aria-label={addDataSetFlyoutStrings.datasetIdLabel()}
            />
          </EuiFormRow>
          <EuiFormRow
            label={addDataSetFlyoutStrings.resourceLabel()}
            helpText={addDataSetFlyoutStrings.resourceHelp()}
            isInvalid={Boolean(resourceError)}
            error={resourceError}
            fullWidth
          >
            <EuiTextArea
              name="resource"
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              isInvalid={Boolean(resourceError)}
              data-test-subj="addDataSetFlyoutResource"
              fullWidth
              rows={4}
              aria-label={addDataSetFlyoutStrings.resourceLabel()}
            />
          </EuiFormRow>
          <EuiFormRow
            label={addDataSetFlyoutStrings.descriptionLabel()}
            helpText={addDataSetFlyoutStrings.descriptionHelp()}
            fullWidth
          >
            <EuiTextArea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-test-subj="addDataSetFlyoutDescription"
              fullWidth
              rows={3}
              aria-label={addDataSetFlyoutStrings.descriptionLabel()}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="addDataSetAdvancedSettings"
            buttonContent={addDataSetFlyoutStrings.settingsPanelTitle()}
            paddingSize="m"
            data-test-subj="addDataSetFlyoutAdvancedSettings"
          >
            <EuiFormRow
              label={addDataSetFlyoutStrings.partitionDetectionLabel()}
              helpText={addDataSetFlyoutStrings.partitionDetectionHelp()}
              fullWidth
            >
              <EuiSelect
                options={partitionOptions}
                value={partitionDetection}
                onChange={(e) =>
                  setPartitionDetection(e.target.value as DataSetPartitionDetection)
                }
                data-test-subj="addDataSetFlyoutPartitionDetection"
                aria-label={addDataSetFlyoutStrings.partitionDetectionLabel()}
              />
            </EuiFormRow>
          </EuiAccordion>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" data-test-subj="addDataSetFlyoutClose" onClick={onClose}>
              {dataSourcePreviewFlyoutStrings.closeButton()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              type="button"
              data-test-subj="addDataSetFlyoutSave"
              onClick={() => void handleSave()}
              isLoading={isSaving}
              disabled={isSaving}
            >
              {addDataSetFlyoutStrings.saveButton()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
