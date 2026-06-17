/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  EuiHorizontalRule,
  EuiInputPopover,
  EuiSelect,
  EuiSelectable,
  type EuiSelectableOption,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';

import type { DataSourceListItem } from '../common/sample_data_sources_client';
import type { DataSetListItem, DataSetPartitionDetection } from '../common/sample_data_sets_client';
import { addDataSetFlyoutStrings } from './add_data_set_flyout_i18n';
import { dataSourcePreviewFlyoutStrings } from './data_source_preview_flyout_i18n';

export interface AddDataSetFlyoutPayload {
  /** When set, the parent saves by updating instead of inserting. */
  editingSetId?: string;
  sourceName: string;
  datasetId: string;
  resource: string;
  description: string;
  partitionDetection: DataSetPartitionDetection;
}

export interface AddDataSetFlyoutProps {
  /**
   * When set, create a data set for this source without showing the source picker.
   * Omit to show a data source dropdown (supply `sourcesForPicker`).
   */
  presetSource?: DataSourceListItem;
  /** When `presetSource` is omitted, used to populate the data source picker. */
  sourcesForPicker?: DataSourceListItem[];
  /** Used with `presetSource` to preload and update an existing sample data set row. */
  existingEditSet?: DataSetListItem;
  /** Called when deleting from edit mode (after confirmation in parent). Closing the flyout is the parent's responsibility on success. */
  onDeleteExistingSet?: () => Promise<void>;
  onClose: () => void;
  /** Resolve `null` on success, or an error message to display in the flyout. */
  onSave: (values: AddDataSetFlyoutPayload) => Promise<string | null>;
  /** When provided, renders an "Add new data source" link in the source picker footer. */
  onAddNewSource?: () => void;
  /** When set by the parent (after a new source is created), auto-selects that source. */
  newlyCreatedSourceName?: string;
}

export const AddDataSetFlyout: FunctionComponent<AddDataSetFlyoutProps> = ({
  presetSource,
  sourcesForPicker = [],
  existingEditSet,
  onDeleteExistingSet,
  onClose,
  onSave,
  onAddNewSource,
  newlyCreatedSourceName,
}) => {
  const titleId = 'addDataSetFlyoutTitle';
  const isEditMode = Boolean(existingEditSet);
  const isPickSourceMode = !presetSource && !isEditMode;

  const [pickedSourceName, setPickedSourceName] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  const [datasetId, setDatasetId] = useState(existingEditSet?.name ?? '');
  const [resource, setResource] = useState(existingEditSet?.resource ?? '');
  const [description, setDescription] = useState(existingEditSet?.description ?? '');
  const [partitionDetection, setPartitionDetection] = useState<DataSetPartitionDetection>(
    existingEditSet?.partitionDetection ?? 'none'
  );
  const [sourceError, setSourceError] = useState<string | undefined>();
  const [datasetIdError, setDatasetIdError] = useState<string | undefined>();
  const [resourceError, setResourceError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const showDeleteInFooter = isEditMode && typeof onDeleteExistingSet === 'function';

  const partitionOptions = useMemo(
    () => [
      { value: 'none', text: addDataSetFlyoutStrings.partitionOptionNone() },
      { value: 'hive', text: addDataSetFlyoutStrings.partitionOptionHive() },
    ],
    []
  );

  const selectableSourceOptions = useMemo((): EuiSelectableOption[] => {
    const term = inputValue.trim().toLowerCase();
    return [...sourcesForPicker]
      .filter((src) => !term || src.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((src) => ({
        label: src.name,
        key: src.name,
        checked: src.name === pickedSourceName ? ('on' as const) : undefined,
      }));
  }, [sourcesForPicker, pickedSourceName, inputValue]);

  const handleSelectableChange = useCallback((options: EuiSelectableOption[]) => {
    const selected = options.find((o) => o.checked === 'on');
    if (selected) {
      setPickedSourceName(selected.label);
      setInputValue(selected.label);
      setSourceError(undefined);
      setIsSourcePickerOpen(false);
    }
  }, []);

  const handleSourcePickerClose = useCallback(() => {
    setIsSourcePickerOpen(false);
    setInputValue(pickedSourceName);
  }, [pickedSourceName]);

  const handleSourceFieldClick = useCallback(() => {
    setInputValue('');
    setIsSourcePickerOpen(true);
  }, []);

  useEffect(() => {
    if (newlyCreatedSourceName) {
      setPickedSourceName(newlyCreatedSourceName);
      setInputValue(newlyCreatedSourceName);
      setSourceError(undefined);
    }
  }, [newlyCreatedSourceName]);

  const resolvedSourceName = presetSource ? presetSource.name : pickedSourceName;

  const handleSave = useCallback(async () => {
    const trimmedId = datasetId.trim();
    const trimmedResource = resource.trim();
    const sourceName = resolvedSourceName.trim();
    setSourceError(undefined);
    setDatasetIdError(undefined);
    setResourceError(undefined);
    setSaveError(undefined);

    if (isPickSourceMode && sourceName === '') {
      setSourceError(addDataSetFlyoutStrings.sourceRequired());
      return;
    }
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
        editingSetId: existingEditSet?.id,
        sourceName: isEditMode ? existingEditSet!.sourceName : sourceName,
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
  }, [
    datasetId,
    description,
    existingEditSet,
    isEditMode,
    isPickSourceMode,
    onSave,
    partitionDetection,
    resource,
    resolvedSourceName,
  ]);

  const handleDeleteExisting = useCallback(async () => {
    if (!onDeleteExistingSet) {
      return;
    }
    setDeleteError(undefined);
    setIsDeleting(true);
    try {
      await onDeleteExistingSet();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsDeleting(false);
    }
  }, [onDeleteExistingSet]);

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
          <h2 id={titleId}>
            {isEditMode && presetSource && existingEditSet
              ? addDataSetFlyoutStrings.titleEdit(presetSource.name, existingEditSet.name)
              : presetSource
              ? addDataSetFlyoutStrings.title(presetSource.name)
              : addDataSetFlyoutStrings.titlePickSource()}
          </h2>
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
          {deleteError ? (
            <>
              <EuiText color="danger" size="s" data-test-subj="addDataSetFlyoutDeleteError">
                {deleteError}
              </EuiText>
              <EuiSpacer size="m" />
            </>
          ) : null}
          {isPickSourceMode ? (
            <>
              <EuiFormRow
                label={addDataSetFlyoutStrings.sourceLabel()}
                helpText={addDataSetFlyoutStrings.sourceHelp()}
                isInvalid={Boolean(sourceError)}
                error={sourceError}
                fullWidth
              >
                <EuiInputPopover
                  fullWidth
                  disableFocusTrap
                  isOpen={isSourcePickerOpen}
                  closePopover={handleSourcePickerClose}
                  input={
                    <EuiFieldText
                      value={inputValue}
                      placeholder={addDataSetFlyoutStrings.sourcePlaceholder()}
                      isInvalid={Boolean(sourceError)}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        if (!isSourcePickerOpen) setIsSourcePickerOpen(true);
                      }}
                      onClick={handleSourceFieldClick}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') handleSourcePickerClose();
                      }}
                      autoFocus={isPickSourceMode}
                      fullWidth
                      icon={{ type: isSourcePickerOpen ? 'arrowUp' : 'arrowDown', side: 'right' }}
                      data-test-subj="addDataSetFlyoutDataSourceTrigger"
                      aria-label={addDataSetFlyoutStrings.sourceLabel()}
                      aria-haspopup="listbox"
                      aria-expanded={isSourcePickerOpen}
                    />
                  }
                >
                  <EuiSelectable
                    options={selectableSourceOptions}
                    onChange={handleSelectableChange}
                    singleSelection
                    listProps={{
                      onFocusBadge: false,
                      'data-test-subj': 'addDataSetFlyoutDataSource',
                    }}
                    noMatchesMessage={addDataSetFlyoutStrings.sourceNoMatches()}
                    height={Math.min(selectableSourceOptions.length * 32 || 32, 200)}
                  >
                    {(list) => list}
                  </EuiSelectable>
                  {onAddNewSource ? (
                    <>
                      <EuiHorizontalRule margin="none" />
                      <EuiButtonEmpty
                        size="s"
                        iconType="plusInCircle"
                        flush="left"
                        onClick={() => {
                          setIsSourcePickerOpen(false);
                          onAddNewSource();
                        }}
                        data-test-subj="addDataSetFlyoutAddNewSource"
                        css={{ width: '100%' }}
                      >
                        {addDataSetFlyoutStrings.addNewSource()}
                      </EuiButtonEmpty>
                    </>
                  ) : null}
                </EuiInputPopover>
              </EuiFormRow>
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
              disabled={isEditMode}
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              isInvalid={Boolean(datasetIdError)}
              data-test-subj="addDataSetFlyoutDatasetId"
              autoFocus={!isPickSourceMode && !isEditMode}
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
              autoFocus={isEditMode}
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
                onChange={(e) => setPartitionDetection(e.target.value as DataSetPartitionDetection)}
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
            <EuiButtonEmpty
              flush="left"
              data-test-subj="addDataSetFlyoutClose"
              onClick={onClose}
              disabled={isSaving || isDeleting}
            >
              {dataSourcePreviewFlyoutStrings.closeButton()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              {showDeleteInFooter ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    color="danger"
                    data-test-subj="addDataSetFlyoutDelete"
                    onClick={() => void handleDeleteExisting()}
                    isLoading={isDeleting}
                    disabled={isSaving || isDeleting}
                  >
                    {addDataSetFlyoutStrings.deleteDataSetButton()}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  type="button"
                  data-test-subj="addDataSetFlyoutSave"
                  onClick={() => void handleSave()}
                  isLoading={isSaving}
                  disabled={
                    isSaving ||
                    isDeleting ||
                    (isPickSourceMode && sourcesForPicker.length === 0 && pickedSourceName === '')
                  }
                >
                  {isEditMode
                    ? addDataSetFlyoutStrings.editSaveButton()
                    : addDataSetFlyoutStrings.saveButton()}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
