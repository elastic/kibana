/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { Controller, useFieldArray, useFormContext, useFormState } from 'react-hook-form';
import type { BuildConnectorFormData, ConnectorTypeField, FieldListPath } from './types';

interface Props {
  /** Form path of the field list. */
  name: FieldListPath;
  /** Name of the object the fields end up in, e.g. `Config`. */
  title: string;
  /** One line under the title saying who fills these fields in and how to reference them. */
  description: React.ReactNode;
  /** Shown when hovering the info icon next to the title. */
  tooltipContent: React.ReactNode;
  addButtonLabel: string;
  testSubjPrefix: string;
}

const EMPTY_FIELD: ConnectorTypeField = {
  name: '',
  type: 'string',
  required: false,
  label: '',
  description: '',
};

const fieldTypeOptions: Array<{ value: ConnectorTypeField['type']; text: string }> = [
  {
    value: 'string',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.fieldType.string', {
      defaultMessage: 'String',
    }),
  },
  {
    value: 'number',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.fieldType.number', {
      defaultMessage: 'Number',
    }),
  },
  {
    value: 'boolean',
    text: i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorFlyout.fieldType.boolean',
      { defaultMessage: 'Boolean' }
    ),
  },
  {
    value: 'array',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.fieldType.array', {
      defaultMessage: 'Array',
    }),
  },
];

const arrayItemTypeOptions = [
  {
    value: '',
    text: i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorFlyout.fieldType.selectItemType',
      { defaultMessage: 'Select item type' }
    ),
  },
  ...fieldTypeOptions.filter(({ value }) => value !== 'array'),
];

const LABELS = {
  name: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.field.nameLabel', {
    defaultMessage: 'Name',
  }),
  type: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.field.typeLabel', {
    defaultMessage: 'Type',
  }),
  items: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.field.itemsLabel', {
    defaultMessage: 'Item type',
  }),
  required: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorFlyout.field.requiredLabel',
    { defaultMessage: 'Required' }
  ),
  label: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.field.labelLabel', {
    defaultMessage: 'Label',
  }),
  labelTooltip: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorFlyout.field.labelTooltip',
    {
      defaultMessage:
        'Display name of this field in the form where its value is entered. Defaults to the field name.',
    }
  ),
  description: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorFlyout.field.descriptionLabel',
    { defaultMessage: 'Description' }
  ),
  remove: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorFlyout.field.removeButtonLabel',
    { defaultMessage: 'Remove field' }
  ),
};

/** Editor for a list of field definitions (name, type, required, label, description). */
const FieldListEditorComponent: React.FC<Props> = ({
  name,
  title,
  description,
  tooltipContent,
  addButtonLabel,
  testSubjPrefix,
}) => {
  const { control, trigger } = useFormContext<BuildConnectorFormData>();
  const { fields, append, remove } = useFieldArray({ control, name });
  const { errors } = useFormState({ control, name });
  const listError: string | undefined = get(errors, `${name}.root.message`);

  return (
    <div data-test-subj={testSubjPrefix}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>{title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="info"
            color="subdued"
            position="right"
            content={tooltipContent}
            iconProps={{ 'data-test-subj': `${testSubjPrefix}-info` }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued" data-test-subj={`${testSubjPrefix}-description`}>
        {description}
      </EuiText>
      {fields.map((item, index) => (
        <React.Fragment key={item.id}>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="s" data-test-subj={`${testSubjPrefix}-row-${index}`}>
            <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
              <EuiFlexItem grow={2}>
                <Controller
                  name={`${name}.${index}.name`}
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <EuiFormRow
                      label={LABELS.name}
                      display="rowCompressed"
                      isInvalid={!!error}
                      error={error?.message}
                    >
                      <EuiFieldText
                        compressed
                        isInvalid={!!error}
                        data-test-subj={`${testSubjPrefix}-${index}-name`}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                      />
                    </EuiFormRow>
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <Controller
                  name={`${name}.${index}.type`}
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <>
                      <EuiFormRow
                        label={LABELS.type}
                        display="rowCompressed"
                        isInvalid={!!error}
                        error={error?.message}
                      >
                        <EuiSelect
                          compressed
                          isInvalid={!!error}
                          options={fieldTypeOptions}
                          data-test-subj={`${testSubjPrefix}-${index}-type`}
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            void trigger();
                          }}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                        />
                      </EuiFormRow>
                      {field.value === 'array' && (
                        <Controller
                          name={`${name}.${index}.items`}
                          control={control}
                          render={({ field: itemsField, fieldState: { error: itemsError } }) => (
                            <EuiFormRow
                              label={LABELS.items}
                              display="rowCompressed"
                              isInvalid={!!itemsError}
                              error={itemsError?.message}
                            >
                              <EuiSelect
                                compressed
                                isInvalid={!!itemsError}
                                options={arrayItemTypeOptions}
                                data-test-subj={`${testSubjPrefix}-${index}-items`}
                                value={itemsField.value ?? ''}
                                onChange={(event) => {
                                  itemsField.onChange(event.target.value || undefined);
                                  void trigger();
                                }}
                                onBlur={itemsField.onBlur}
                                inputRef={itemsField.ref}
                              />
                            </EuiFormRow>
                          )}
                        />
                      )}
                    </>
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <Controller
                  name={`${name}.${index}.required`}
                  control={control}
                  render={({ field }) => (
                    <EuiFormRow hasEmptyLabelSpace display="rowCompressed">
                      <EuiSwitch
                        compressed
                        label={LABELS.required}
                        data-test-subj={`${testSubjPrefix}-${index}-required`}
                        checked={field.value ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        onBlur={field.onBlur}
                      />
                    </EuiFormRow>
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace display="rowCompressed">
                  <EuiToolTip content={LABELS.remove} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="minusCircle"
                      color="danger"
                      aria-label={LABELS.remove}
                      data-test-subj={`${testSubjPrefix}-${index}-remove`}
                      onClick={() => remove(index)}
                    />
                  </EuiToolTip>
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
              <EuiFlexItem grow={2}>
                <Controller
                  name={`${name}.${index}.label`}
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <EuiFormRow
                      label={
                        <span>
                          {LABELS.label}{' '}
                          <EuiIconTip
                            type="question"
                            color="subdued"
                            content={LABELS.labelTooltip}
                            iconProps={{
                              'data-test-subj': `${testSubjPrefix}-${index}-label-info`,
                            }}
                          />
                        </span>
                      }
                      display="rowCompressed"
                      isInvalid={!!error}
                      error={error?.message}
                    >
                      <EuiFieldText
                        compressed
                        isInvalid={!!error}
                        data-test-subj={`${testSubjPrefix}-${index}-label`}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                      />
                    </EuiFormRow>
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <Controller
                  name={`${name}.${index}.description`}
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <EuiFormRow
                      label={LABELS.description}
                      display="rowCompressed"
                      isInvalid={!!error}
                      error={error?.message}
                    >
                      <EuiFieldText
                        compressed
                        isInvalid={!!error}
                        data-test-subj={`${testSubjPrefix}-${index}-description`}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                      />
                    </EuiFormRow>
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </React.Fragment>
      ))}
      {listError && (
        <EuiFormErrorText data-test-subj={`${testSubjPrefix}-error`}>{listError}</EuiFormErrorText>
      )}
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        size="s"
        iconType="plusCircle"
        onClick={() => append(EMPTY_FIELD)}
        data-test-subj={`${testSubjPrefix}-add`}
      >
        {addButtonLabel}
      </EuiButtonEmpty>
    </div>
  );
};

export const FieldListEditor = memo(FieldListEditorComponent);
