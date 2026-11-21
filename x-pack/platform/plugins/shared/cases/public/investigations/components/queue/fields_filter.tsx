/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiFieldText,
  EuiFilterButton,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiSelectable,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { ICONS } from '../../icons';
import type { QueueFieldDef } from './use_queue_fields';
import * as i18n from './translations';

const TEXT_MAX_LENGTH = 512;
const TOGGLE_CONTROL = 'TOGGLE';

const getChoices = (field: QueueFieldDef): Array<{ value: string; text: string }> | undefined => {
  if (field.control === TOGGLE_CONTROL) {
    return [
      { value: 'true', text: i18n.FILTER_FIELDS_YES },
      { value: 'false', text: i18n.FILTER_FIELDS_NO },
    ];
  }
  return field.options?.map((option) => ({ value: option, text: option }));
};

interface FieldFilterRowProps {
  field: QueueFieldDef;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

/** A value picker for fields with fixed values; a text input that applies on Enter or blur. */
const FieldFilterRow: React.FC<FieldFilterRowProps> = ({ field, value, onChange }) => {
  const choices = getChoices(field);
  const [text, setText] = useState(value ?? '');
  useEffect(() => setText(value ?? ''), [value]);

  const commitText = () => {
    const next = text.trim();
    if (next !== (value ?? '')) {
      onChange(next || undefined);
    }
  };

  return (
    <EuiFormRow label={field.label} display="rowCompressed" fullWidth>
      {choices ? (
        <EuiSelect
          compressed
          fullWidth
          options={[{ value: '', text: i18n.FILTER_FIELDS_ANY }, ...choices]}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value || undefined)}
          data-test-subj={`investigationsFieldFilter-${field.mirrorKey}`}
        />
      ) : (
        <EuiFieldText
          compressed
          fullWidth
          value={text}
          placeholder={i18n.FILTER_FIELDS_TEXT_PLACEHOLDER}
          maxLength={TEXT_MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitText();
          }}
          data-test-subj={`investigationsFieldFilter-${field.mirrorKey}`}
        />
      )}
    </EuiFormRow>
  );
};
FieldFilterRow.displayName = 'FieldFilterRow';

export interface FieldsFilterProps {
  fields: QueueFieldDef[];
  /** Mirror key to the value being matched. */
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
}

/** The "Fields" filter: one control per form field of the investigation types. */
export const FieldsFilter: React.FC<FieldsFilterProps> = ({ fields, filters, onChange }) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'investigationsFieldsFilter' });
  const activeCount = Object.keys(filters).length;

  const setFilter = (mirrorKey: string, value: string | undefined) => {
    const rest = Object.fromEntries(Object.entries(filters).filter(([key]) => key !== mirrorKey));
    onChange(value === undefined ? rest : { ...rest, [mirrorKey]: value });
  };

  return (
    <EuiPopover
      id={popoverId}
      aria-label={i18n.FILTER_FIELDS}
      button={
        <EuiFilterButton
          iconType={ICONS.chevronDown}
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          hasActiveFilters={activeCount > 0}
          numActiveFilters={activeCount > 0 ? activeCount : undefined}
          aria-label={
            activeCount > 0
              ? i18n.FILTER_ACTIVE_COUNT(i18n.FILTER_FIELDS, activeCount)
              : i18n.FILTER_FIELDS
          }
          data-test-subj="investigationsFilterFields"
        >
          {i18n.FILTER_FIELDS}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <div
        css={css`
          width: ${euiTheme.base * 20}px;
        `}
        data-test-subj="investigationsFilterFieldsPanel"
      >
        <EuiPopoverTitle paddingSize="s">{i18n.FILTER_FIELDS_TITLE}</EuiPopoverTitle>
        <div
          css={css`
            max-height: ${euiTheme.base * 24}px;
            overflow-y: auto;
            padding: ${euiTheme.size.s};
          `}
        >
          {fields.length === 0 ? (
            <EuiText size="s" color="subdued">
              {i18n.FILTER_FIELDS_NONE}
            </EuiText>
          ) : (
            fields.map((field) => (
              <FieldFilterRow
                key={field.mirrorKey}
                field={field}
                value={filters[field.mirrorKey]}
                onChange={(value) => setFilter(field.mirrorKey, value)}
              />
            ))
          )}
          {fields.length > 0 ? (
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                margin-block-start: ${euiTheme.size.s};
              `}
            >
              {i18n.FILTER_FIELDS_HELP}
            </EuiText>
          ) : null}
        </div>
      </div>
    </EuiPopover>
  );
};
FieldsFilter.displayName = 'FieldsFilter';

export interface ColumnsPickerProps {
  fields: QueueFieldDef[];
  /** Mirror keys of the columns shown. */
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** Chooses which form fields appear as extra columns in the queue table. */
export const ColumnsPicker: React.FC<ColumnsPickerProps> = ({ fields, selected, onChange }) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'investigationsColumns' });

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      fields.map(({ mirrorKey, label }) => ({
        key: mirrorKey,
        label,
        checked: selected.includes(mirrorKey) ? 'on' : undefined,
        'data-test-subj': `investigationsColumn-${mirrorKey}`,
      })),
    [fields, selected]
  );
  const shown = selected.filter((key) => fields.some(({ mirrorKey }) => mirrorKey === key)).length;

  return (
    <EuiPopover
      id={popoverId}
      aria-label={i18n.COLUMNS_BUTTON}
      button={
        <EuiFilterButton
          iconType={ICONS.chevronDown}
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          hasActiveFilters={shown > 0}
          numActiveFilters={shown > 0 ? shown : undefined}
          aria-label={shown > 0 ? i18n.COLUMNS_ACTIVE_COUNT(shown) : i18n.COLUMNS_BUTTON}
          data-test-subj="investigationsColumnsButton"
        >
          {i18n.COLUMNS_BUTTON}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiSelectable
        aria-label={i18n.COLUMNS_TITLE}
        searchable
        searchProps={{
          compressed: true,
          placeholder: i18n.COLUMNS_SEARCH,
          'aria-label': i18n.COLUMNS_SEARCH,
          'data-test-subj': 'investigationsColumnsSearch',
        }}
        options={options}
        emptyMessage={i18n.FILTER_NO_OPTIONS}
        onChange={(changed) =>
          onChange(changed.filter(({ checked }) => checked === 'on').map(({ key }) => String(key)))
        }
        listProps={{ onFocusBadge: false }}
      >
        {(list, search) => (
          <div
            css={css`
              width: ${euiTheme.base * 16}px;
            `}
          >
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
ColumnsPicker.displayName = 'ColumnsPicker';
