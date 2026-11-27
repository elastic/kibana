/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../../common/constants';
import type {
  MergeCustomFieldPreview,
  MergeExtendedFieldPreview,
  MergePreviewCase,
} from '../../../../common/types/api';
import { CustomFieldTypes } from '../../../../common/types/domain';
import { FieldType } from '../../../../common/types/domain/template/fields';
import { toSelectedUsers } from '../../templates_v2/field_types/controls/user_picker/utils';
import type { CustomFieldChoice, MergeFieldKey } from '../utils';
import type { BlockingStateKind } from './field_state';
import { FieldRow } from './field_row';
import {
  OtherDateInput,
  OtherNumberInput,
  OtherSelectInput,
  OtherTextInput,
  OtherUserInput,
} from './other_value_card';
import { SingleValueRow } from './single_value_row';
import * as i18n from './translations';

type CustomFieldValue = CustomFieldChoice['value'];

/** A custom field value as the user reads it. */
export const formatCustomValue = (type: string, value: CustomFieldValue): string => {
  if (value == null || value === '') {
    return i18n.NOT_SET;
  }
  if (type === CustomFieldTypes.TOGGLE) {
    return value === true ? i18n.TOGGLE_ON : i18n.TOGGLE_OFF;
  }
  return String(value);
};

const parseArray = (value: string): unknown[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [value];
  }
};

/** A template field value as the user reads it: dates formatted, toggles as On/Off, users by name. */
export const formatExtendedValue = (
  field: Pick<MergeExtendedFieldPreview, 'control' | 'definition'>,
  value: string
): string => {
  if (value.length === 0) {
    return i18n.NOT_SET;
  }
  switch (field.control) {
    case FieldType.TOGGLE:
      return value === 'true' ? i18n.TOGGLE_ON : value === 'false' ? i18n.TOGGLE_OFF : value;
    case FieldType.DATE_PICKER: {
      const isLocal = field.definition.metadata?.timezone === 'local';
      const date = isLocal ? moment(value) : moment.utc(value);
      return date.isValid()
        ? date.format(field.definition.metadata?.showTime ? 'lll' : 'll')
        : value;
    }
    case FieldType.USER_PICKER: {
      const users = toSelectedUsers(value);
      return users.length > 0 ? users.map(({ name }) => name).join(', ') : i18n.UNKNOWN_USER;
    }
    case FieldType.CHECKBOX_GROUP:
      return parseArray(value).map(String).join(', ');
    default:
      return value;
  }
};

interface CustomFieldRowProps {
  field: MergeCustomFieldPreview;
  choice: CustomFieldChoice | undefined;
  onChoose: (choice: CustomFieldChoice) => void;
  blockingState?: BlockingStateKind;
  /** Why the AI chose the value, until the user changes it. */
  aiReason?: string;
  cases: MergePreviewCase[];
  isDisabled: boolean;
}

/** A legacy custom field: text, number or toggle. */
export const CustomFieldRow: React.FC<CustomFieldRowProps> = ({
  field,
  choice,
  onChoose,
  blockingState,
  aiReason,
  cases,
  isDisabled,
}) => {
  const fieldKey: MergeFieldKey = `customFields.${field.key}`;
  const setValue = (value: CustomFieldValue) => onChoose({ type: field.type, value });
  const own = choice?.value;

  const input =
    field.type === CustomFieldTypes.NUMBER ? (
      <OtherNumberInput
        fieldLabel={field.label}
        value={own != null ? String(own) : ''}
        onChange={(raw) => setValue(raw.trim().length > 0 ? Number(raw) : null)}
        isDisabled={isDisabled}
      />
    ) : field.type === CustomFieldTypes.TEXT ? (
      <OtherTextInput
        fieldLabel={field.label}
        value={typeof own === 'string' ? own : ''}
        onChange={(raw) => setValue(raw.length > 0 ? raw : null)}
        maxLength={MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}
        isDisabled={isDisabled}
      />
    ) : null;

  if (field.options.length === 0) {
    return (
      <FieldRow
        fieldKey={fieldKey}
        label={field.label}
        state={blockingState ?? (choice != null ? 'own' : 'required')}
      >
        {input}
      </FieldRow>
    );
  }

  return (
    <SingleValueRow<CustomFieldValue>
      fieldKey={fieldKey}
      label={field.label}
      options={field.options}
      chosen={choice?.value}
      hasChoice={choice !== undefined}
      onChoose={setValue}
      renderValue={(value) => formatCustomValue(field.type, value)}
      toText={(value) => formatCustomValue(field.type, value)}
      blockingState={blockingState}
      aiReason={aiReason}
      other={
        input != null
          ? {
              label: field.type === CustomFieldTypes.NUMBER ? i18n.OTHER_NUMBER : i18n.OTHER_VALUE,
              renderInput: () => input,
            }
          : undefined
      }
      cases={cases}
      isDisabled={isDisabled}
    />
  );
};
CustomFieldRow.displayName = 'CustomFieldRow';

interface ExtendedFieldRowProps {
  field: MergeExtendedFieldPreview;
  choice: string | undefined;
  onChoose: (value: string) => void;
  blockingState?: BlockingStateKind;
  stateText?: string;
  /** Why the AI chose the value, until the user changes it. */
  aiReason?: string;
  cases: MergePreviewCase[];
  isDisabled: boolean;
}

const getOtherLabel = (control: string): string => {
  switch (control) {
    case FieldType.INPUT_NUMBER:
      return i18n.OTHER_NUMBER;
    case FieldType.DATE_PICKER:
      return i18n.OTHER_DATE;
    case FieldType.SELECT_BASIC:
    case FieldType.RADIO_GROUP:
      return i18n.OTHER_OPTION;
    case FieldType.USER_PICKER:
      return i18n.SOMEONE_ELSE;
    default:
      return i18n.OTHER_VALUE;
  }
};

/** A single-value template or global field, with the input its control type needs. */
export const ExtendedFieldRow: React.FC<ExtendedFieldRowProps> = ({
  field,
  choice,
  onChoose,
  blockingState,
  stateText,
  aiReason,
  cases,
  isDisabled,
}) => {
  const fieldKey: MergeFieldKey = `extendedFields.${field.key}`;
  const { definition } = field;
  const own = choice ?? '';
  const heldValues = new Set(field.options.map(({ value }) => value));

  const renderInput = (): React.ReactNode => {
    switch (field.control) {
      case FieldType.INPUT_NUMBER:
        return (
          <OtherNumberInput
            fieldLabel={field.label}
            value={own}
            onChange={onChoose}
            min={definition.validation?.min}
            max={definition.validation?.max}
            isDisabled={isDisabled}
          />
        );
      case FieldType.DATE_PICKER:
        return (
          <OtherDateInput
            fieldLabel={field.label}
            value={own}
            onChange={onChoose}
            showTime={definition.metadata?.showTime}
            timezone={definition.metadata?.timezone}
            isDisabled={isDisabled}
          />
        );
      case FieldType.SELECT_BASIC:
      case FieldType.RADIO_GROUP:
        return (
          <OtherSelectInput
            fieldLabel={field.label}
            options={(definition.options ?? []).filter((option) => !heldValues.has(option))}
            value={own}
            onChange={onChoose}
            isDisabled={isDisabled}
          />
        );
      case FieldType.USER_PICKER: {
        const [user] = toSelectedUsers(own);
        return (
          <OtherUserInput
            fieldLabel={field.label}
            value={user ?? null}
            onChange={(next) => onChoose(next != null ? JSON.stringify([next]) : '')}
            isDisabled={isDisabled}
          />
        );
      }
      case FieldType.TOGGLE:
        return null;
      default:
        return (
          <OtherTextInput
            fieldLabel={field.label}
            value={own}
            onChange={onChoose}
            maxLength={definition.validation?.maxLength}
            multiline={field.control === FieldType.TEXTAREA}
            isDisabled={isDisabled}
          />
        );
    }
  };

  if (field.options.length === 0) {
    return (
      <FieldRow
        fieldKey={fieldKey}
        label={field.label}
        state={blockingState ?? (own.length > 0 ? 'own' : 'required')}
        stateText={stateText}
      >
        {renderInput()}
      </FieldRow>
    );
  }

  const hasOther = field.control !== FieldType.TOGGLE;
  return (
    <SingleValueRow<string>
      fieldKey={fieldKey}
      label={field.label}
      options={field.options}
      chosen={choice}
      hasChoice={choice !== undefined}
      onChoose={onChoose}
      renderValue={(value) => formatExtendedValue(field, value)}
      toText={(value) => formatExtendedValue(field, value)}
      blockingState={blockingState}
      stateText={stateText}
      aiReason={aiReason}
      layout={
        field.control === FieldType.INPUT_TEXT || field.control === FieldType.TEXTAREA
          ? 'list'
          : 'inline'
      }
      other={
        hasOther
          ? {
              label: getOtherLabel(field.control),
              renderInput: () => renderInput(),
            }
          : undefined
      }
      cases={cases}
      isDisabled={isDisabled}
    />
  );
};
ExtendedFieldRow.displayName = 'ExtendedFieldRow';
