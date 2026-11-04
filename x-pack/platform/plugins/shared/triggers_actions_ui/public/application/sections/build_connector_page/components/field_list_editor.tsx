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
  EuiFieldNumber,
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
import type {
  BuildConnectorFormData,
  ConnectorTypeField,
  ConnectorTypeFieldFormat,
  FieldListPath,
} from '../types';

interface Props {
  /** Form path of the field list. */
  name: FieldListPath;
  /** Name of the object the fields end up in, e.g. `Config`. */
  title: string;
  /** Hide the title when the host already names the list, e.g. a step title; the info icon stays. */
  showTitle?: boolean;
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
};

const fieldTypeOptions: Array<{ value: ConnectorTypeField['type']; text: string }> = [
  {
    value: 'string',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.fieldType.string', {
      defaultMessage: 'String',
    }),
  },
  {
    value: 'number',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.fieldType.number', {
      defaultMessage: 'Number',
    }),
  },
  {
    value: 'boolean',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.fieldType.boolean', {
      defaultMessage: 'Boolean',
    }),
  },
  {
    value: 'array',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.fieldType.array', {
      defaultMessage: 'Array',
    }),
  },
];

const arrayItemTypeOptions = [
  {
    value: '',
    text: i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorPage.fieldType.selectItemType',
      { defaultMessage: 'Select item type' }
    ),
  },
  ...fieldTypeOptions.filter(({ value }) => value !== 'array'),
];

const fieldFormatOptions: Array<{ value: ConnectorTypeFieldFormat | ''; text: string }> = [
  {
    value: '',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.format.none', {
      defaultMessage: 'No format',
    }),
  },
  {
    value: 'uri',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.format.uri', {
      defaultMessage: 'URI',
    }),
  },
  {
    value: 'ipv4',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.format.ipv4', {
      defaultMessage: 'IPv4 address',
    }),
  },
  {
    value: 'date-time',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.format.dateTime', {
      defaultMessage: 'Date and time (ISO 8601)',
    }),
  },
];

const booleanDefaultOptions = [
  {
    value: '',
    text: i18n.translate('xpack.triggersActionsUI.buildConnector.default.unset', {
      defaultMessage: 'No default',
    }),
  },
  {
    value: 'true',
    text: i18n.translate('xpack.triggersActionsUI.buildConnector.default.true', {
      defaultMessage: 'True',
    }),
  },
  {
    value: 'false',
    text: i18n.translate('xpack.triggersActionsUI.buildConnector.default.false', {
      defaultMessage: 'False',
    }),
  },
];

const LABELS = {
  name: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.field.nameLabel', {
    defaultMessage: 'Name',
  }),
  type: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.field.typeLabel', {
    defaultMessage: 'Type',
  }),
  format: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.field.formatLabel', {
    defaultMessage: 'Format',
  }),
  items: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.field.itemsLabel', {
    defaultMessage: 'Item type',
  }),
  default: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorPage.field.defaultLabel',
    {
      defaultMessage: 'Default value',
    }
  ),
  required: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorPage.field.requiredLabel',
    { defaultMessage: 'Required' }
  ),
  label: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.field.labelLabel', {
    defaultMessage: 'Label',
  }),
  labelTooltip: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorPage.field.labelTooltip',
    {
      defaultMessage:
        'Display name of this field in the form where its value is entered. Defaults to the field name.',
    }
  ),
  description: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorPage.field.descriptionLabel',
    { defaultMessage: 'Description' }
  ),
  remove: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorPage.field.removeButtonLabel',
    { defaultMessage: 'Remove field' }
  ),
};

/** Editor for a list of field definitions (name, type, required, label, description). */
const FieldListEditorComponent: React.FC<Props> = ({
  name,
  title,
  showTitle = true,
  description,
  tooltipContent,
  addButtonLabel,
  testSubjPrefix,
}) => {
  const { control, setValue, trigger, watch } = useFormContext<BuildConnectorFormData>();
  const { fields, append, remove } = useFieldArray({ control, name });
  const { errors } = useFormState({ control, name });
  const listError: string | undefined = get(errors, `${name}.root.message`);
  const renderDefault = (index: number, fieldType: ConnectorTypeField['type']) => (
    <Controller
      name={`${name}.${index}.default`}
      control={control}
      render={({ field: defaultField, fieldState: { error: defaultError } }) => (
        <EuiFormRow
          label={LABELS.default}
          display="rowCompressed"
          isInvalid={!!defaultError}
          error={defaultError?.message}
        >
          {fieldType === 'number' ? (
            <EuiFieldNumber
              compressed
              isInvalid={!!defaultError}
              data-test-subj={`${testSubjPrefix}-${index}-default`}
              value={typeof defaultField.value === 'number' ? defaultField.value : ''}
              onChange={(event) =>
                defaultField.onChange(
                  event.target.value === '' ? undefined : Number(event.target.value)
                )
              }
              onBlur={defaultField.onBlur}
              inputRef={defaultField.ref}
            />
          ) : fieldType === 'boolean' ? (
            <EuiSelect
              compressed
              isInvalid={!!defaultError}
              options={booleanDefaultOptions}
              data-test-subj={`${testSubjPrefix}-${index}-default`}
              value={typeof defaultField.value === 'boolean' ? String(defaultField.value) : ''}
              onChange={(event) =>
                defaultField.onChange(
                  event.target.value === '' ? undefined : event.target.value === 'true'
                )
              }
              onBlur={defaultField.onBlur}
              inputRef={defaultField.ref}
            />
          ) : (
            <EuiFieldText
              compressed
              isInvalid={!!defaultError}
              data-test-subj={`${testSubjPrefix}-${index}-default`}
              value={typeof defaultField.value === 'string' ? defaultField.value : ''}
              onChange={(event) => defaultField.onChange(event.target.value || undefined)}
              onBlur={defaultField.onBlur}
              inputRef={defaultField.ref}
            />
          )}
        </EuiFormRow>
      )}
    />
  );
  const infoIcon = (
    <EuiIconTip
      type="info"
      color="subdued"
      position="right"
      content={tooltipContent}
      iconProps={{ 'data-test-subj': `${testSubjPrefix}-info` }}
    />
  );

  return (
    <div data-test-subj={testSubjPrefix}>
      {showTitle && (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{infoIcon}</EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiText size="xs" color="subdued" data-test-subj={`${testSubjPrefix}-description`}>
        {description}
        {!showTitle && <> {infoIcon}</>}
      </EuiText>
      {fields.map((item, index) => {
        const fieldType = watch(`${name}.${index}.type`);
        return (
          <React.Fragment key={item.id}>
            <EuiSpacer size="s" />
            <EuiPanel hasBorder paddingSize="s" data-test-subj={`${testSubjPrefix}-row-${index}`}>
              <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                <EuiFlexItem grow={1}>
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
                  <EuiSpacer size="s" />
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
                  <EuiSpacer size="s" />
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
                <EuiFlexItem grow={1}>
                  <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                    <EuiFlexItem>
                      <Controller
                        name={`${name}.${index}.type`}
                        control={control}
                        render={({ field, fieldState: { error } }) => (
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
                                setValue(`${name}.${index}.default`, undefined);
                                setValue(`${name}.${index}.format`, undefined);
                                void trigger();
                              }}
                              onBlur={field.onBlur}
                              inputRef={field.ref}
                            />
                          </EuiFormRow>
                        )}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      {fieldType === 'array' && (
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
                      {fieldType === 'string' && (
                        <Controller
                          name={`${name}.${index}.format`}
                          control={control}
                          render={({ field: formatField, fieldState: { error: formatError } }) => (
                            <EuiFormRow
                              label={LABELS.format}
                              display="rowCompressed"
                              isInvalid={!!formatError}
                              error={formatError?.message}
                            >
                              <EuiSelect
                                compressed
                                isInvalid={!!formatError}
                                options={fieldFormatOptions}
                                data-test-subj={`${testSubjPrefix}-${index}-format`}
                                value={formatField.value ?? ''}
                                onChange={(event) => {
                                  formatField.onChange(event.target.value || undefined);
                                  void trigger();
                                }}
                                onBlur={formatField.onBlur}
                                inputRef={formatField.ref}
                              />
                            </EuiFormRow>
                          )}
                        />
                      )}
                      {(fieldType === 'number' || fieldType === 'boolean') &&
                        renderDefault(index, fieldType)}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  {fieldType === 'string' && (
                    <>
                      <EuiSpacer size="s" />
                      {renderDefault(index, fieldType)}
                    </>
                  )}
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
            </EuiPanel>
          </React.Fragment>
        );
      })}
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
