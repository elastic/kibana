/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DatasetMappingFieldType } from '../../../../common/dataset_types';
import { FormRowLabelWithInfo } from '../../components/form_row_label_with_info';
import { DatetimeFormatComboBox } from '../../components/datetime_format_combo_box';
import { FieldTypeSelect } from './field_type_select';

export interface FieldMappingFormValue<TType extends string = string> {
  type: '' | TType;
  name: string;
  path: string;
  format: string;
}

export interface FieldMappingFormErrors {
  name?: string;
  type?: string;
  format?: string;
}

export interface FieldMappingFormProps {
  value: FieldMappingFormValue;
  errors?: FieldMappingFormErrors;
  mode: 'create' | 'edit';
  onSubmit: (value: FieldMappingFormValue) => void;
  onCancel?: () => void;
  onDraftChange?: (value: FieldMappingFormValue) => void;
}

const isDateLikeType = (type: DatasetMappingFieldType): boolean => {
  return type === 'date' || type === 'date_nanos';
};

const CreateButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <EuiButton
      size="m"
      color="primary"
      fill
      onClick={onClick}
      data-test-subj="dataFederationMappingEditorDraftAddField"
    >
      {i18n.translate('xpack.dataFederation.mappingEditor.addFirstField', {
        defaultMessage: 'Add field',
      })}
    </EuiButton>
  );
};

const CancelButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <EuiButtonEmpty
      size="m"
      onClick={onClick}
      data-test-subj="dataFederationMappingEditorCancelField"
    >
      {i18n.translate('xpack.dataFederation.mappingEditor.cancelField', {
        defaultMessage: 'Cancel',
      })}
    </EuiButtonEmpty>
  );
};

const UpdateButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <EuiButton
      size="s"
      color="primary"
      fill
      onClick={onClick}
      data-test-subj="dataFederationMappingEditorUpdateField"
    >
      {i18n.translate('xpack.dataFederation.mappingEditor.updateField', {
        defaultMessage: 'Update',
      })}
    </EuiButton>
  );
};

export function FieldMappingForm({
  value,
  errors,
  mode,
  onSubmit,
  onCancel,
  onDraftChange,
}: FieldMappingFormProps) {
  const [draft, setDraft] = useState<FieldMappingFormValue>(value);
  const isDateType = Boolean(draft.type) && isDateLikeType(draft.type as DatasetMappingFieldType);

  const updateDraft = (patch: Partial<FieldMappingFormValue>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      onDraftChange?.(next);
      return next;
    });
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup
          gutterSize="m"
          alignItems="flexStart"
          responsive={false}
          wrap
          style={{ width: '100%' }}
        >
          <EuiFlexItem grow={false} style={{ maxWidth: 200, minWidth: 200 }}>
            <FieldTypeSelect
              value={draft.type}
              onChange={(nextType) => {
                updateDraft({
                  type: nextType,
                  ...(isDateLikeType(nextType) ? {} : { format: '' }),
                });
              }}
            />
          </EuiFlexItem>

          <EuiFlexItem style={{ minWidth: 240 }}>
            <EuiFormRow
              label={i18n.translate('xpack.dataFederation.mappingEditor.logicalName', {
                defaultMessage: 'Field name',
              })}
              helpText={i18n.translate('xpack.dataFederation.mappingEditor.logicalNameHelp', {
                defaultMessage: 'How this field should be named in queries.',
              })}
              isInvalid={Boolean(errors?.name)}
              error={errors?.name}
              fullWidth
            >
              <EuiFieldText
                isInvalid={Boolean(errors?.name)}
                fullWidth
                value={draft.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                data-test-subj="dataFederationMappingEditorFieldName"
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem style={{ minWidth: 260 }}>
            <EuiFormRow
              label={i18n.translate('xpack.dataFederation.mappingEditor.originalFieldNameLabel', {
                defaultMessage: 'Original field name',
              })}
              helpText={i18n.translate('xpack.dataFederation.mappingEditor.originalFieldNameHelp', {
                defaultMessage:
                  'Name as it appears in your source files, when different from the field name',
              })}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                value={draft.path}
                onChange={(e) => updateDraft({ path: e.target.value })}
                data-test-subj="dataFederationMappingEditorFieldPath"
              />
            </EuiFormRow>
          </EuiFlexItem>

          {isDateType ? (
            <EuiFlexItem style={{ minWidth: 260, maxWidth: 260 }}>
              <EuiFormRow
                label={
                  <FormRowLabelWithInfo
                    label={i18n.translate('xpack.dataFederation.mappingEditor.formatLabel', {
                      defaultMessage: 'Date format',
                    })}
                    infoText={i18n.translate('xpack.dataFederation.mappingEditor.formatTooltip', {
                      defaultMessage: 'Date parsing pattern, for example yyyy-MM-dd HH:mm:ss.',
                    })}
                  />
                }
                isInvalid={Boolean(errors?.format)}
                error={errors?.format}
                fullWidth
              >
                <DatetimeFormatComboBox
                  value={draft.format}
                  onChange={(next) => updateDraft({ format: next })}
                  onBlur={() => {}}
                  placeholder={i18n.translate(
                    'xpack.dataFederation.mappingEditor.formatPlaceholder',
                    {
                      defaultMessage: 'Select or enter a format',
                    }
                  )}
                  data-test-subj="dataFederationMappingEditorFieldFormat"
                  aria-label={i18n.translate('xpack.dataFederation.mappingEditor.formatAriaLabel', {
                    defaultMessage: 'Select or enter a format',
                  })}
                />
              </EuiFormRow>
            </EuiFlexItem>
          ) : (
            <></>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          {onCancel ? (
            <EuiFlexItem grow={false}>
              <CancelButton onClick={onCancel} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            {mode === 'create' ? (
              <CreateButton onClick={() => onSubmit(draft)} />
            ) : (
              <UpdateButton onClick={() => onSubmit(draft)} />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
