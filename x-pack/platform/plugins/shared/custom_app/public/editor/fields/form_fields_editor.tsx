/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useId } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  MAX_FORM_FIELDS,
  MAX_HEADING_LENGTH,
  createStateKey,
  setStateDeclaration,
  updateNode,
  type AppDocument,
  type FormField,
} from '@kbn/custom-app-common';
import { IconButton, SelectField, TextField } from './fields';
import { OptionsEditor } from './list_editors';

type Kind = FormField['kind'];

const KIND_OPTIONS: ReadonlyArray<{ value: Kind; text: string }> = [
  {
    value: 'text',
    text: i18n.translate('xpack.customApp.editor.formKindText', { defaultMessage: 'Short text' }),
  },
  {
    value: 'textarea',
    text: i18n.translate('xpack.customApp.editor.formKindTextarea', {
      defaultMessage: 'Long text',
    }),
  },
  {
    value: 'select',
    text: i18n.translate('xpack.customApp.editor.formKindSelect', { defaultMessage: 'Choice' }),
  },
];

const STARTING_OPTIONS = [{ value: 'option-1' }, { value: 'option-2' }];

/** The same field, asked another way: what only one way has is dropped, and what the other needs is added. */
const withKind = (field: FormField, kind: Kind): FormField => {
  const { bind, label, required } = field;
  const base = { bind, label, ...(required === undefined ? {} : { required }) };
  const placeholder = field.kind === 'select' ? undefined : field.placeholder;
  switch (kind) {
    case 'select':
      return {
        ...base,
        kind,
        options: field.kind === 'select' ? field.options : STARTING_OPTIONS,
      };
    case 'text':
    case 'textarea':
      return { ...base, kind, ...(placeholder === undefined ? {} : { placeholder }) };
  }
};

const FieldEditor = ({
  position,
  field,
  canRemove,
  onChange,
  onRemove,
}: {
  position: number;
  field: FormField;
  canRemove: boolean;
  onChange: (next: FormField) => void;
  onRemove: () => void;
}) => {
  const requiredId = useId();

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s" data-test-subj="customAppFormField">
      <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false}>
        <EuiFlexItem>
          <TextField
            label={i18n.translate('xpack.customApp.editor.formFieldLabel', {
              defaultMessage: 'Question {position}',
              values: { position },
            })}
            value={field.label}
            maxLength={MAX_HEADING_LENGTH}
            onChange={(label) => onChange({ ...field, label })}
          />
        </EuiFlexItem>
        {canRemove && (
          <EuiFlexItem grow={false}>
            <IconButton
              iconType="trash"
              color="danger"
              label={i18n.translate('xpack.customApp.editor.removeFormField', {
                defaultMessage: 'Remove question {position}',
                values: { position },
              })}
              onClick={onRemove}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <SelectField
        label={i18n.translate('xpack.customApp.editor.formFieldKind', {
          defaultMessage: 'Answered with {position}',
          values: { position },
        })}
        value={field.kind}
        options={KIND_OPTIONS}
        onChange={(kind) => onChange(withKind(field, kind))}
      />
      {field.kind === 'select' ? (
        <OptionsEditor
          options={field.options}
          onChange={(options) => onChange({ ...field, options })}
        />
      ) : (
        <TextField
          label={i18n.translate('xpack.customApp.editor.formFieldPlaceholder', {
            defaultMessage: 'Placeholder {position}',
            values: { position },
          })}
          value={field.placeholder ?? ''}
          maxLength={MAX_HEADING_LENGTH}
          onChange={(placeholder) => onChange({ ...field, placeholder: placeholder || undefined })}
        />
      )}
      <EuiSwitch
        compressed
        id={requiredId}
        label={i18n.translate('xpack.customApp.editor.formFieldRequired', {
          defaultMessage: 'Required (question {position})',
          values: { position },
        })}
        checked={field.required === true}
        onChange={(event) => onChange({ ...field, required: event.target.checked || undefined })}
      />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.customApp.editor.formFieldValueName', {
            defaultMessage: 'The answer is the value {name}, which a workflow can be given.',
            values: { name: field.bind },
          })}
        </p>
      </EuiText>
    </EuiPanel>
  );
};

/**
 * What a form asks. Each question gets a value of the app of its own, made with it, which is how
 * what was answered reaches a workflow; nobody has to think of the names.
 */
export const FormFieldsEditor = ({
  nodeId,
  fields,
  onChange,
  onEdit,
}: {
  nodeId: string;
  fields: readonly FormField[];
  onChange: (fields: FormField[]) => void;
  onEdit: (change: (document: AppDocument) => AppDocument, coalesceKey?: string) => void;
}) => {
  const replace = (index: number, next: FormField) =>
    onChange(fields.map((field, position) => (position === index ? next : field)));

  const add = () =>
    onEdit((current) => {
      const label = i18n.translate('xpack.customApp.editor.newFormField', {
        defaultMessage: 'Question {position}',
        values: { position: fields.length + 1 },
      });
      const bind = createStateKey(current, label);
      const withValue = setStateDeclaration(current, bind, { type: 'string', default: '' });
      const result = updateNode<'form'>(withValue, nodeId, {
        fields: [...fields, { bind, kind: 'text', label }],
      });
      return result.ok ? result.document : current;
    });

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      {fields.map((field, index) => (
        <EuiFlexItem grow={false} key={field.bind}>
          <FieldEditor
            position={index + 1}
            field={field}
            canRemove={fields.length > 1}
            onChange={(next) => replace(index, next)}
            onRemove={() => onChange(fields.filter((_field, position) => position !== index))}
          />
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="plusCircle"
          isDisabled={fields.length >= MAX_FORM_FIELDS}
          onClick={add}
          data-test-subj="customAppAddFormField"
        >
          {i18n.translate('xpack.customApp.editor.addFormField', {
            defaultMessage: 'Add a question',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
