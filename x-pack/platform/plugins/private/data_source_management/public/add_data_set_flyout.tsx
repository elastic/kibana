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
import type { DataSetListItem } from '../common/sample_data_sets_client';
import { addDataSetFlyoutStrings } from './add_data_set_flyout_i18n';

export interface DatasetSettings {
  format: string;
  partition_detection: string;
  schema_sample_size: string;
  delimiter: string;
  mode: string;
  header_row: string;
  null_value: string;
  encoding: string;
  error_mode: string;
  max_errors: string;
  max_error_ratio: string;
  quote: string;
  escape: string;
  comment: string;
  column_prefix: string;
  datetime_format: string;
  multi_value_syntax: string;
  max_field_size: string;
  segment_size: string;
  optimized_reader: string;
  late_materialization: string;
}

const emptySettings = (): DatasetSettings => ({
  format: '',
  partition_detection: '',
  schema_sample_size: '',
  delimiter: '',
  mode: '',
  header_row: '',
  null_value: '',
  encoding: '',
  error_mode: '',
  max_errors: '',
  max_error_ratio: '',
  quote: '',
  escape: '',
  comment: '',
  column_prefix: '',
  datetime_format: '',
  multi_value_syntax: '',
  max_field_size: '',
  segment_size: '',
  optimized_reader: '',
  late_materialization: '',
});

const initialSettingsFromEditSet = (existingEditSet?: DataSetListItem): DatasetSettings => {
  const base = emptySettings();
  if (!existingEditSet) {
    return base;
  }
  const editSetWithSettings = existingEditSet as DataSetListItem & { settings?: DatasetSettings };
  if (editSetWithSettings.settings) {
    return { ...base, ...editSetWithSettings.settings };
  }
  if (existingEditSet.partitionDetection) {
    return { ...base, partition_detection: existingEditSet.partitionDetection };
  }
  return base;
};

export interface AddDataSetFlyoutPayload {
  /** When set, the parent saves by updating instead of inserting. */
  editingSetId?: string;
  sourceName: string;
  datasetId: string;
  resource: string;
  description: string;
  settings: DatasetSettings;
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
  /** Names of existing datasets used to validate duplicate names on save. */
  existingDataSetNames?: string[];
  onClose: () => void;
  /** Resolve `null` on success, or an error message to display in the flyout. */
  onSave: (values: AddDataSetFlyoutPayload) => Promise<string | null>;
  /** When provided, renders an "Add new data source" link in the source picker footer. */
  onAddNewSource?: () => void;
  /** When set by the parent (after a new source is created), auto-selects that source. */
  newlyCreatedSourceName?: string;
}

const FormatSpecificFields: FunctionComponent<{
  format: string;
  settings: DatasetSettings;
  onChange: (key: keyof DatasetSettings, value: string) => void;
}> = ({ format, settings, onChange }) => {
  if (format === 'csv' || format === 'tsv') {
    return (
      <>
        <EuiFormRow label={addDataSetFlyoutStrings.delimiterLabel()} fullWidth>
          <EuiFieldText
            value={settings.delimiter}
            onChange={(e) => onChange('delimiter', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.modeLabel()} fullWidth>
          <EuiSelect
            options={[
              { value: '', text: '' },
              { value: 'quoted', text: addDataSetFlyoutStrings.modeQuoted() },
              { value: 'escaped', text: addDataSetFlyoutStrings.modeEscaped() },
              { value: 'plain', text: addDataSetFlyoutStrings.modePlain() },
            ]}
            value={settings.mode}
            onChange={(e) => onChange('mode', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.headerRowLabel()} fullWidth>
          <EuiSelect
            options={[
              { value: '', text: addDataSetFlyoutStrings.headerRowDefault() },
              { value: 'true', text: addDataSetFlyoutStrings.headerRowYes() },
              { value: 'false', text: addDataSetFlyoutStrings.headerRowNo() },
            ]}
            value={settings.header_row}
            onChange={(e) => onChange('header_row', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.nullValueLabel()} fullWidth>
          <EuiFieldText
            value={settings.null_value}
            onChange={(e) => onChange('null_value', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.encodingLabel()} fullWidth>
          <EuiFieldText
            value={settings.encoding}
            onChange={(e) => onChange('encoding', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.errorModeLabel()} fullWidth>
          <EuiSelect
            options={[
              { value: '', text: '' },
              { value: 'fail_fast', text: addDataSetFlyoutStrings.errorModeFailFast() },
              { value: 'skip_row', text: addDataSetFlyoutStrings.errorModeSkipRow() },
              { value: 'null_field', text: addDataSetFlyoutStrings.errorModeNullField() },
            ]}
            value={settings.error_mode}
            onChange={(e) => onChange('error_mode', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.maxErrorsLabel()} fullWidth>
          <EuiFieldText
            value={settings.max_errors}
            onChange={(e) => onChange('max_errors', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.maxErrorRatioLabel()} fullWidth>
          <EuiFieldText
            value={settings.max_error_ratio}
            onChange={(e) => onChange('max_error_ratio', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.quoteLabel()} fullWidth>
          <EuiFieldText
            value={settings.quote}
            onChange={(e) => onChange('quote', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.escapeLabel()} fullWidth>
          <EuiFieldText
            value={settings.escape}
            onChange={(e) => onChange('escape', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.commentLabel()} fullWidth>
          <EuiFieldText
            value={settings.comment}
            onChange={(e) => onChange('comment', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.columnPrefixLabel()} fullWidth>
          <EuiFieldText
            value={settings.column_prefix}
            onChange={(e) => onChange('column_prefix', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.datetimeFormatLabel()} fullWidth>
          <EuiFieldText
            value={settings.datetime_format}
            onChange={(e) => onChange('datetime_format', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.multiValueSyntaxLabel()} fullWidth>
          <EuiSelect
            options={[
              { value: '', text: '' },
              { value: 'none', text: addDataSetFlyoutStrings.multiValueNone() },
              { value: 'brackets', text: addDataSetFlyoutStrings.multiValueBrackets() },
            ]}
            value={settings.multi_value_syntax}
            onChange={(e) => onChange('multi_value_syntax', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.maxFieldSizeLabel()} fullWidth>
          <EuiFieldText
            value={settings.max_field_size}
            onChange={(e) => onChange('max_field_size', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.schemaSampleSizeLabel()} fullWidth>
          <EuiFieldText
            value={settings.schema_sample_size}
            onChange={(e) => onChange('schema_sample_size', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
      </>
    );
  }

  if (format === 'ndjson') {
    return (
      <>
        <EuiFormRow label={addDataSetFlyoutStrings.schemaSampleSizeLabel()} fullWidth>
          <EuiFieldText
            value={settings.schema_sample_size}
            onChange={(e) => onChange('schema_sample_size', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.segmentSizeLabel()} fullWidth>
          <EuiFieldText
            value={settings.segment_size}
            onChange={(e) => onChange('segment_size', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
      </>
    );
  }

  if (format === 'parquet') {
    const boolOptions = [
      { value: '', text: addDataSetFlyoutStrings.booleanDefault() },
      { value: 'true', text: addDataSetFlyoutStrings.booleanTrue() },
      { value: 'false', text: addDataSetFlyoutStrings.booleanFalse() },
    ];
    return (
      <>
        <EuiFormRow label={addDataSetFlyoutStrings.optimizedReaderLabel()} fullWidth>
          <EuiSelect
            options={boolOptions}
            value={settings.optimized_reader}
            onChange={(e) => onChange('optimized_reader', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={addDataSetFlyoutStrings.lateMaterializationLabel()} fullWidth>
          <EuiSelect
            options={boolOptions}
            value={settings.late_materialization}
            onChange={(e) => onChange('late_materialization', e.target.value)}
            fullWidth
          />
        </EuiFormRow>
      </>
    );
  }

  return null;
};

export const AddDataSetFlyout: FunctionComponent<AddDataSetFlyoutProps> = ({
  presetSource,
  sourcesForPicker = [],
  existingEditSet,
  existingDataSetNames,
  onClose,
  onSave,
  onAddNewSource,
  newlyCreatedSourceName,
}) => {
  const titleId = 'addDataSetFlyoutTitle';
  const isEditMode = Boolean(existingEditSet);
  const isPickSourceMode = !presetSource && !isEditMode;
  const showSourcePicker = isPickSourceMode || (isEditMode && !presetSource);

  const [pickedSourceName, setPickedSourceName] = useState(existingEditSet?.sourceName ?? '');
  const [inputValue, setInputValue] = useState(existingEditSet?.sourceName ?? '');
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  const [datasetId, setDatasetId] = useState(existingEditSet?.name ?? '');
  const [resource, setResource] = useState(existingEditSet?.resource ?? '');
  const [description, setDescription] = useState(existingEditSet?.description ?? '');
  const [settings, setSettings] = useState<DatasetSettings>(() =>
    initialSettingsFromEditSet(existingEditSet)
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sourceError, setSourceError] = useState<string | undefined>();
  const [datasetIdError, setDatasetIdError] = useState<string | undefined>();
  const [resourceError, setResourceError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const setSetting = useCallback((key: keyof DatasetSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const partitionOptions = useMemo(
    () => [
      { value: '', text: addDataSetFlyoutStrings.partitionOptionDefault() },
      { value: 'auto', text: addDataSetFlyoutStrings.partitionOptionAuto() },
      { value: 'hive', text: addDataSetFlyoutStrings.partitionOptionHive() },
      { value: 'template', text: addDataSetFlyoutStrings.partitionOptionTemplate() },
      { value: 'none', text: addDataSetFlyoutStrings.partitionOptionNone() },
    ],
    []
  );

  const formatOptions = useMemo(
    () => [
      { value: '', text: addDataSetFlyoutStrings.formatDefault() },
      { value: 'parquet', text: addDataSetFlyoutStrings.formatParquet() },
      { value: 'csv', text: addDataSetFlyoutStrings.formatCsv() },
      { value: 'tsv', text: addDataSetFlyoutStrings.formatTsv() },
      { value: 'ndjson', text: addDataSetFlyoutStrings.formatNdjson() },
      { value: 'orc', text: addDataSetFlyoutStrings.formatOrc() },
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

    if (showSourcePicker && sourceName === '') {
      setSourceError(addDataSetFlyoutStrings.sourceRequired());
      return;
    }
    if (!trimmedId) {
      setDatasetIdError(addDataSetFlyoutStrings.nameRequired());
      return;
    }
    if (
      existingDataSetNames?.some((n) => n.toLowerCase() === trimmedId.toLowerCase()) &&
      !(isEditMode && existingEditSet?.name.toLowerCase() === trimmedId.toLowerCase())
    ) {
      setDatasetIdError(addDataSetFlyoutStrings.nameAlreadyExists());
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
        sourceName: isEditMode && !showSourcePicker ? existingEditSet!.sourceName : sourceName,
        datasetId: trimmedId,
        resource: trimmedResource,
        description: description.trim(),
        settings,
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
    existingDataSetNames,
    existingEditSet,
    isEditMode,
    onSave,
    resource,
    resolvedSourceName,
    settings,
    showSourcePicker,
  ]);

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
            {isEditMode && existingEditSet
              ? addDataSetFlyoutStrings.titleEdit(existingEditSet.name)
              : presetSource
              ? addDataSetFlyoutStrings.title(presetSource.name)
              : addDataSetFlyoutStrings.titlePickSource()}
          </h2>
        </EuiTitle>
        {!isEditMode && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>{addDataSetFlyoutStrings.createDescription()}</p>
            </EuiText>
          </>
        )}
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
          {showSourcePicker ? (
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
                      autoFocus={showSourcePicker}
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
            label={addDataSetFlyoutStrings.nameLabel()}
            helpText={addDataSetFlyoutStrings.nameHelp()}
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
              autoFocus={!showSourcePicker}
              fullWidth
              aria-label={addDataSetFlyoutStrings.nameLabel()}
            />
          </EuiFormRow>
          <EuiFormRow
            label={addDataSetFlyoutStrings.resourceLabel()}
            helpText={addDataSetFlyoutStrings.resourceHelp()}
            isInvalid={Boolean(resourceError)}
            error={resourceError}
            fullWidth
          >
            <EuiFieldText
              name="resource"
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              isInvalid={Boolean(resourceError)}
              data-test-subj="addDataSetFlyoutResource"
              fullWidth
              aria-label={addDataSetFlyoutStrings.resourceLabel()}
            />
          </EuiFormRow>
          <EuiFormRow label={addDataSetFlyoutStrings.descriptionLabel()} fullWidth>
            <EuiTextArea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-test-subj="addDataSetFlyoutDescription"
              fullWidth
              rows={1}
              aria-label={addDataSetFlyoutStrings.descriptionLabel()}
            />
          </EuiFormRow>
          <EuiFormRow label={addDataSetFlyoutStrings.formatLabel()} fullWidth>
            <EuiSelect
              options={formatOptions}
              value={settings.format}
              onChange={(e) => setSetting('format', e.target.value)}
              data-test-subj="addDataSetFlyoutFormat"
              fullWidth
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiButtonEmpty
            size="s"
            iconType={showAdvanced ? 'arrowDown' : 'arrowRight'}
            onClick={() => setShowAdvanced(!showAdvanced)}
            data-test-subj="addDataSetFlyoutAdvancedToggle"
            flush="left"
          >
            {showAdvanced
              ? addDataSetFlyoutStrings.advancedSettingsHide()
              : addDataSetFlyoutStrings.advancedSettingsShow()}
          </EuiButtonEmpty>
          {showAdvanced && (
            <>
              <EuiSpacer size="m" />
              <EuiFormRow label={addDataSetFlyoutStrings.partitionDetectionLabel()} fullWidth>
                <EuiSelect
                  options={partitionOptions}
                  value={settings.partition_detection}
                  onChange={(e) => setSetting('partition_detection', e.target.value)}
                  data-test-subj="addDataSetFlyoutPartitionDetection"
                  fullWidth
                />
              </EuiFormRow>
              <FormatSpecificFields format={settings.format} settings={settings} onChange={setSetting} />
            </>
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              data-test-subj="addDataSetFlyoutClose"
              onClick={onClose}
              disabled={isSaving}
            >
              {addDataSetFlyoutStrings.cancelButton()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              type="button"
              data-test-subj="addDataSetFlyoutSave"
              onClick={() => void handleSave()}
              isLoading={isSaving}
              disabled={
                isSaving ||
                (showSourcePicker && sourcesForPicker.length === 0 && pickedSourceName === '')
              }
            >
              {isEditMode
                ? addDataSetFlyoutStrings.editSaveButton()
                : addDataSetFlyoutStrings.saveButton()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
