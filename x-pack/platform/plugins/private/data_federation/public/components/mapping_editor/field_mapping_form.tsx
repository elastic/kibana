/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DatasetMappingFieldType } from '../../../common/dataset_types';

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
  onChange: (patch: Partial<FieldMappingFormValue>) => void;
  typeHelpText?: ReactNode;
  errors?: FieldMappingFormErrors;
  mode: 'create' | 'edit';
  onSubmit: () => void;
  onCancel?: () => void;
}

const isDateLikeType = (type: DatasetMappingFieldType): boolean => {
  return type === 'date' || type === 'date_nanos';
};

const DEFAULT_TYPE_OPTIONS: Array<{ value: '' | DatasetMappingFieldType; text: string }> = [
  { value: 'boolean', text: 'Boolean' },
  { value: 'date', text: 'Date' },
  { value: 'date_nanos', text: 'Date nanos' },
  { value: 'double', text: 'Double' },
  { value: 'integer', text: 'Integer' },
  { value: 'ip', text: 'IP' },
  { value: 'keyword', text: 'Keyword' },
  { value: 'long', text: 'Long' },
  { value: 'unsigned_long', text: 'Unsigned long' },
];

const CreateButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <EuiButton
      size="s"
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
      size="s"
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

export const getFieldTypeDocsHelpText = (
  type: DatasetMappingFieldType,
  infoByValue: Record<DatasetMappingFieldType, { label: string; docs: string }>
): React.ReactNode => {
  const info = infoByValue[type];
  if (!info) return;

  return (
    <EuiLink href={info.docs} target="_blank" external>
      {i18n.translate('xpack.dataFederation.mappingEditor.fieldTypeDocsLink', {
        defaultMessage: 'View documentation for {type} field type',
        values: { type: info.label },
      })}
    </EuiLink>
  );
};

export function FieldMappingForm({
  value,
  onChange,
  typeHelpText,
  errors,
  mode,
  onSubmit,
  onCancel,
}: FieldMappingFormProps) {
  const isDateType = Boolean(value.type) && isDateLikeType(value.type as DatasetMappingFieldType);

  return (
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m" alignItems="flexStart">
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.dataFederation.mappingEditor.typeLabel', {
                defaultMessage: 'Field type',
              })}
              helpText={typeHelpText}
              isInvalid={Boolean(errors?.type)}
              error={errors?.type}
              fullWidth
            >
              <EuiSelect
                isInvalid={Boolean(errors?.type)}
                fullWidth
                options={DEFAULT_TYPE_OPTIONS as unknown as Array<{ value: string; text: string }>}
                value={value.type}
                onChange={(e) => {
                  const nextType = e.target.value as DatasetMappingFieldType;
                  const nextTypeIsDate = isDateLikeType(nextType);
                  onChange({
                    type: nextType,
                    ...(nextTypeIsDate ? {} : { format: '' }),
                  });
                }}
                data-test-subj="dataFederationMappingEditorFieldType"
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.dataFederation.mappingEditor.logicalName', {
                defaultMessage: 'Field name',
              })}
              isInvalid={Boolean(errors?.name)}
              error={errors?.name}
              fullWidth
            >
              <EuiFieldText
                isInvalid={Boolean(errors?.name)}
                fullWidth
                value={value.name}
                onChange={(e) => onChange({ name: e.target.value })}
                data-test-subj="dataFederationMappingEditorFieldName"
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.dataFederation.mappingEditor.physicalPath', {
                defaultMessage: 'Original field name (optional)',
              })}
              helpText={i18n.translate('xpack.dataFederation.mappingEditor.physicalPathHelp', {
                defaultMessage: 'Physical column name, if differs from field name.',
              })}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                value={value.path}
                onChange={(e) => onChange({ path: e.target.value })}
                data-test-subj="dataFederationMappingEditorFieldPath"
              />
            </EuiFormRow>
          </EuiFlexItem>

          {isDateType ? (
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.dataFederation.mappingEditor.formatLabel', {
                  defaultMessage: 'format (optional)',
                })}
                isInvalid={Boolean(errors?.format)}
                error={errors?.format}
                fullWidth
              >
                <EuiFieldText
                  isInvalid={Boolean(errors?.format)}
                  fullWidth
                  value={value.format}
                  onChange={(e) => onChange({ format: e.target.value })}
                  data-test-subj="dataFederationMappingEditorFieldFormat"
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
              <CreateButton onClick={onSubmit} />
            ) : (
              <UpdateButton onClick={onSubmit} />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
