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
  pathHelpText?: ReactNode;
  errors?: FieldMappingFormErrors;
  mode: 'create' | 'edit';
  onSubmit: () => void;
}

const DEFAULT_DATE_TYPE_VALUE: DatasetMappingFieldType = 'date';

const DEFAULT_TYPE_OPTIONS: Array<{ value: '' | DatasetMappingFieldType; text: string }> = [
  {
    value: '',
    text: i18n.translate('xpack.dataFederation.mappingEditor.typePlaceholder', {
      defaultMessage: 'Select type',
    }),
  },
  { value: 'boolean', text: 'Boolean' },
  { value: 'date', text: 'Date' },
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
      iconType="plusCircle"
      size="s"
      onClick={onClick}
      data-test-subj="dataFederationMappingEditorDraftAddField"
    >
      {i18n.translate('xpack.dataFederation.mappingEditor.addFirstField', {
        defaultMessage: 'Add field',
      })}
    </EuiButton>
  );
};

const EditButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <EuiFlexGroup gutterSize="s" direction="row" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          iconType="check"
          size="s"
          onClick={onClick}
          data-test-subj="dataFederationMappingEditorDoneField"
        >
          {i18n.translate('xpack.dataFederation.mappingEditor.doneField', {
            defaultMessage: 'Done',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
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
  pathHelpText,
  errors,
  mode,
  onSubmit,
}: FieldMappingFormProps) {
  const isDateType = value.type === DEFAULT_DATE_TYPE_VALUE;

  return (
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
            options={DEFAULT_TYPE_OPTIONS}
            value={value.type}
            onChange={(e) => {
              const nextType = e.target.value as '' | DatasetMappingFieldType;
              onChange({
                type: nextType,
                ...(nextType === DEFAULT_DATE_TYPE_VALUE ? {} : { format: '' }),
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
            defaultMessage: 'Rename field to',
          })}
          helpText={pathHelpText}
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

      <EuiFlexItem>
        {isDateType ? (
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
        ) : (
          <div aria-hidden="true" style={{ visibility: 'hidden' }}>
            <EuiFormRow
              label={i18n.translate('xpack.dataFederation.mappingEditor.formatLabel', {
                defaultMessage: 'format (optional)',
              })}
              fullWidth
            >
              <EuiFieldText fullWidth value="" onChange={() => {}} />
            </EuiFormRow>
          </div>
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {mode === 'create' ? (
          <CreateButton onClick={onSubmit} />
        ) : (
          <EditButton onClick={onSubmit} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
