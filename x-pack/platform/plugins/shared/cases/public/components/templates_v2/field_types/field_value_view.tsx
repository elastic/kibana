/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiIcon, EuiText, EuiTextColor, useEuiTheme, useEuiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import { FieldType } from '../../../../common/types/domain/template/fields';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import * as commonI18n from '../../../common/translations';
import * as i18n from '../translations';

interface FieldValueViewProps {
  field: InlineField;
  value: unknown;
  isRequired: boolean;
  isRequiredOnClose: boolean;
  onEdit?: () => void;
}

export interface FieldValueRowProps {
  /** Used to build this row's `data-test-subj`s and its edit button's accessible name. */
  name: string;
  label: string;
  requirementLabel?: string;
  isTextValue?: boolean;
  onEdit?: () => void;
  children: React.ReactNode;
}

const getSelectedValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value !== 'string' || value === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

const getUserNames = (value: unknown): string[] => {
  const parsedValue =
    typeof value === 'string' && value !== ''
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return undefined;
          }
        })()
      : value;

  return Array.isArray(parsedValue)
    ? parsedValue.flatMap((item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { name?: unknown }).name === 'string'
          ? [(item as { name: string }).name]
          : []
      )
    : [];
};

const getValueText = (field: InlineField, value: unknown): string | undefined => {
  if (field.control === FieldType.TOGGLE) {
    if (value === true || value === 'true') return i18n.TOGGLE_ON;
    if (value === false || value === 'false') return i18n.TOGGLE_OFF;
    return undefined;
  }

  if (field.control === FieldType.CHECKBOX_GROUP) {
    const selectedValues = getSelectedValues(value);
    return selectedValues.length > 0 ? selectedValues.join(', ') : undefined;
  }

  if (field.control === FieldType.USER_PICKER) {
    const userNames = getUserNames(value);
    return userNames.length > 0 ? userNames.join(', ') : undefined;
  }

  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return String(value);
};

/**
 * Shared styling for a single "row" of a section in view mode: a label above its value, an edit
 * pencil beside it, and (when `onEdit` is passed) the whole row acting as the edit control. Used by
 * both the template-fields section (via `FieldValueView` below) and the legacy custom fields
 * section, so the two read as the same design rather than two similar-looking implementations.
 */
const useFieldValueRowStyles = () => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs');
  const sFontSize = useEuiFontSize('s');

  return useMemo(
    () => ({
      // The row itself is the edit control. A per-row "Edit" button turns a sidebar of eight
      // fields into a column of eight identical blue links that outweigh the values they sit
      // beside; making the value clickable removes the chrome and halves the targeting work.
      row: css`
        display: flex;
        align-items: flex-start;
        gap: ${euiTheme.size.s};
        inline-size: calc(100% + ${euiTheme.size.base});
        margin-inline: -${euiTheme.size.s};
        padding: ${euiTheme.size.xs} ${euiTheme.size.s};
        border: none;
        border-radius: ${euiTheme.border.radius.small};
        background: transparent;
        text-align: start;
        color: inherit;
      `,
      interactiveRow: css`
        cursor: pointer;

        &:hover,
        &:focus-visible {
          background: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }

        &:hover .templateFieldEditAffordance,
        &:focus-visible .templateFieldEditAffordance {
          opacity: 1;
        }
      `,
      // Label sits directly above its value at a smaller scale, so proximity and contrast — not a
      // divider — say which value belongs to which label.
      label: css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        font-size: ${xsFontSize.fontSize};
        line-height: ${xsFontSize.lineHeight};
        font-weight: ${euiTheme.font.weight.medium};
        color: ${euiTheme.colors.textSubdued};
      `,
      requirement: css`
        font-size: ${xsFontSize.fontSize};
        font-weight: ${euiTheme.font.weight.regular};
        color: ${euiTheme.colors.textWarning};
      `,
      value: css`
        margin-block-start: ${euiTheme.size.xxs};
        font-size: ${sFontSize.fontSize};
        line-height: ${sFontSize.lineHeight};
      `,
      textValue: css`
        overflow-wrap: anywhere;
        white-space: pre-wrap;
      `,
      affordance: css`
        flex-shrink: 0;
        margin-block-start: ${euiTheme.size.xs};
        /* Quietly persistent rather than hover-only: one subdued pencil per row is not the visual
           noise the old column of "Edit" links was, and hiding it entirely would leave the row's
           only signifier undiscoverable on touch. */
        opacity: 0.5;
        transition: opacity ${euiTheme.animation.fast};
        color: ${euiTheme.colors.textSubdued};
      `,
    }),
    [euiTheme, xsFontSize, sFontSize]
  );
};

/**
 * A single section-view row: label (with an optional requirement badge) above its value, an edit
 * pencil affordance beside it, and — when `onEdit` is passed — the whole row acting as the button
 * that requests edit mode. Generic over what a "value" is, so both a template field's resolved
 * value (`FieldValueView` below) and a legacy custom field's own `View` component can render inside
 * it, giving the two sections an identical look without one depending on the other's field model.
 */
export const FieldValueRow: React.FC<FieldValueRowProps> = ({
  name,
  label,
  requirementLabel,
  isTextValue = false,
  onEdit,
  children,
}) => {
  const styles = useFieldValueRowStyles();

  const content = (
    <>
      <span css={{ minInlineSize: 0, flexGrow: 1 }}>
        <span css={styles.label}>
          {label}
          {requirementLabel ? (
            <span css={styles.requirement} data-test-subj={`template-field-requirement-${name}`}>
              {requirementLabel}
            </span>
          ) : null}
        </span>
        <EuiText
          size="s"
          data-test-subj={`template-field-value-text-${name}`}
          css={[styles.value, isTextValue ? styles.textValue : undefined]}
        >
          {children}
        </EuiText>
      </span>
      {onEdit ? (
        <EuiIcon
          type="pencil"
          size="s"
          className="templateFieldEditAffordance"
          css={styles.affordance}
          aria-hidden={true}
        />
      ) : null}
    </>
  );

  if (!onEdit) {
    return (
      <div data-test-subj={`template-field-value-${name}`} css={styles.row}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={i18n.EDIT_FIELD_LABEL(label)}
      data-test-subj={`template-field-edit-${name}`}
      css={[styles.row, styles.interactiveRow]}
    >
      <span data-test-subj={`template-field-value-${name}`} css={{ display: 'contents' }}>
        {content}
      </span>
    </button>
  );
};

FieldValueRow.displayName = 'FieldValueRow';

export const FieldValueView: React.FC<FieldValueViewProps> = ({
  field,
  value,
  isRequired,
  isRequiredOnClose,
  onEdit,
}) => {
  const valueText = useMemo(() => getValueText(field, value), [field, value]);
  const label = field.label ?? field.name;
  const isTextValue =
    field.control === FieldType.INPUT_TEXT || field.control === FieldType.TEXTAREA;

  // "Required" is only actionable while the field is empty; repeating it on filled fields is noise.
  // "Required on close" is a standing obligation, so it stays regardless.
  const requirementLabel = isRequiredOnClose
    ? commonI18n.REQUIRED_ON_CLOSE
    : isRequired && valueText === undefined
    ? commonI18n.REQUIRED
    : undefined;

  return (
    <FieldValueRow
      name={field.name}
      label={label}
      requirementLabel={requirementLabel}
      isTextValue={isTextValue}
      onEdit={onEdit}
    >
      {valueText !== undefined ? (
        valueText
      ) : (
        // One phrase for every empty field, editable or not, so a column of them reads as one
        // state rather than a mix of instructions. Subdued but upright: italics on a third of
        // the rows made the panel look like it was quoting itself.
        <EuiTextColor color="subdued">{i18n.FIELD_VALUE_NOT_SET}</EuiTextColor>
      )}
    </FieldValueRow>
  );
};

FieldValueView.displayName = 'FieldValueView';
