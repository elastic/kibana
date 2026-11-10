/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiComboBox,
  EuiFieldSearch,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { FacetBucket, FieldInfo, Filter, FilterOperator } from '../../../common/types';
import { FILTER_OPERATORS, VALUELESS_OPERATORS } from '../../../common/types';
import { useServices } from '../services';
import { i18nTexts } from '../translations';

const LIST_OPERATORS: readonly FilterOperator[] = ['in', 'notin'];
const PATTERN_OPERATORS: readonly FilterOperator[] = ['contains', 'startswith'];

interface FilterBarProps {
  readonly index: string;
  readonly fields: readonly FieldInfo[];
  readonly filters: readonly Filter[];
  readonly search: string;
  readonly onSearchChange: (search: string) => void;
  readonly onAddFilter: (filter: Filter) => void;
  readonly onReplaceFilter: (previous: Filter, next: Filter) => void;
  readonly onRemoveFilter: (filter: Filter) => void;
}

/** Describes a filter as human-readable text, e.g. `host.name = web-1`. */
export function describeFilter({ field, operator, value }: Filter): string {
  const label = i18nTexts.operatorLabels[operator];
  return VALUELESS_OPERATORS.includes(operator)
    ? `${field} ${label}`
    : `${field} ${label} ${value}`;
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toOption({ value, count }: FacetBucket): EuiComboBoxOptionOption<string> {
  return {
    label: value,
    value,
    append: <EuiBadge color="hollow">{count.toLocaleString()}</EuiBadge>,
  };
}

interface FilterValueInputProps {
  readonly index: string;
  readonly field?: string;
  readonly operator: FilterOperator;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
}

/** Value picker for fields with few distinct values, otherwise a text input. */
function FilterValueInput({
  index,
  field,
  operator,
  value,
  onChange,
  onSubmit,
}: FilterValueInputProps) {
  const { api } = useServices();
  const valuesResult = useAsync(
    async () => (field ? api.getFieldValues(index, field) : undefined),
    [api, index, field]
  );
  const isValueless = VALUELESS_OPERATORS.includes(operator);
  const isList = LIST_OPERATORS.includes(operator);
  const choices = valuesResult.value?.complete ? valuesResult.value.values : undefined;

  if (choices && !isValueless && !PATTERN_OPERATORS.includes(operator)) {
    const selectedValues = isList ? splitList(value) : value ? [value] : [];
    const options = choices.map(toOption);
    return (
      <EuiComboBox
        compressed
        fullWidth
        aria-label={i18nTexts.filterValueLabel}
        placeholder={isList ? i18nTexts.filterSelectValues : i18nTexts.filterSelectValue}
        singleSelection={isList ? false : { asPlainText: true }}
        options={options}
        selectedOptions={selectedValues.map(
          (selected) =>
            options.find((option) => option.value === selected) ?? {
              label: selected,
              value: selected,
            }
        )}
        onChange={(selected) => onChange(selected.map((option) => option.label).join(', '))}
        onCreateOption={(created) =>
          onChange(isList ? [...selectedValues, created.trim()].join(', ') : created.trim())
        }
        data-test-subj="indexExplorerFilterValuePicker"
      />
    );
  }

  return (
    <EuiFieldText
      compressed
      fullWidth
      aria-label={i18nTexts.filterValueLabel}
      placeholder={isList ? i18nTexts.filterListValuePlaceholder : i18nTexts.filterValueLabel}
      value={value}
      disabled={isValueless}
      isLoading={valuesResult.loading}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onSubmit();
        }
      }}
      data-test-subj="indexExplorerFilterValue"
    />
  );
}

interface FilterEditorProps {
  readonly index: string;
  readonly fields: readonly FieldInfo[];
  readonly initial?: Filter;
  readonly submitLabel: string;
  readonly submitIcon: string;
  readonly onSubmit: (filter: Filter) => void;
  /** Stack the inputs vertically, for use inside a popover. */
  readonly vertical?: boolean;
}

/** Field, operator and value inputs for creating or editing one filter. */
function FilterEditor({
  index,
  fields,
  initial,
  submitLabel,
  submitIcon,
  onSubmit,
  vertical = false,
}: FilterEditorProps) {
  const [field, setField] = useState<string | undefined>(initial?.field);
  const [operator, setOperator] = useState<FilterOperator>(initial?.operator ?? 'exact');
  const [value, setValue] = useState(initial?.value ?? '');
  const isValueless = VALUELESS_OPERATORS.includes(operator);

  const fieldOptions: Array<EuiComboBoxOptionOption<string>> = fields.map(({ name, type }) => ({
    label: name,
    value: name,
    append: <EuiBadge color="hollow">{type}</EuiBadge>,
  }));

  function handleSubmit() {
    if (!field) {
      return;
    }
    onSubmit({ field, operator, value: isValueless ? '' : value });
    if (!initial) {
      setValue('');
    }
  }

  const itemCss = vertical ? { minWidth: 320 } : undefined;
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems={vertical ? 'stretch' : 'center'}
      direction={vertical ? 'column' : 'row'}
      responsive={false}
      wrap={!vertical}
    >
      <EuiFlexItem grow={3} css={itemCss ?? { minWidth: 200 }}>
        <EuiComboBox
          compressed
          fullWidth
          aria-label={i18nTexts.filterFieldLabel}
          placeholder={i18nTexts.filterFieldLabel}
          singleSelection={{ asPlainText: true }}
          options={fieldOptions}
          selectedOptions={field ? [{ label: field, value: field }] : []}
          onChange={([selected]) => {
            setField(selected?.value);
            setValue('');
          }}
          data-test-subj="indexExplorerFilterField"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={1} css={itemCss ?? { minWidth: 120 }}>
        <EuiSelect
          compressed
          fullWidth
          aria-label={i18nTexts.filterOperatorLabel}
          options={FILTER_OPERATORS.map((candidate) => ({
            value: candidate,
            text: i18nTexts.operatorLabels[candidate],
          }))}
          value={operator}
          onChange={(event) => {
            const selected = FILTER_OPERATORS.find((candidate) => candidate === event.target.value);
            setOperator(selected ?? 'exact');
          }}
          data-test-subj="indexExplorerFilterOperator"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={3} css={itemCss ?? { minWidth: 200 }}>
        <FilterValueInput
          index={index}
          field={field}
          operator={operator}
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          iconType={submitIcon}
          onClick={handleSubmit}
          isDisabled={!field}
          data-test-subj="indexExplorerSubmitFilter"
        >
          {submitLabel}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface FilterPillProps {
  readonly index: string;
  readonly fields: readonly FieldInfo[];
  readonly filter: Filter;
  readonly onReplace: (filter: Filter) => void;
  readonly onRemove: () => void;
}

/** Active filter badge; click to edit it in a popover, or click the cross to remove it. */
function FilterPill({ index, fields, filter, onReplace, onRemove }: FilterPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useGeneratedHtmlId();
  return (
    <EuiPopover
      aria-labelledby={titleId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      button={
        <EuiBadge
          color="primary"
          iconType="cross"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
          onClickAriaLabel={i18nTexts.editFilter}
          iconOnClick={onRemove}
          iconOnClickAriaLabel={i18nTexts.removeFilter}
          data-test-subj="indexExplorerActiveFilter"
        >
          {describeFilter(filter)}
        </EuiBadge>
      }
    >
      <EuiPopoverTitle id={titleId}>{i18nTexts.editFilter}</EuiPopoverTitle>
      <FilterEditor
        vertical
        index={index}
        fields={fields}
        initial={filter}
        submitLabel={i18nTexts.updateFilter}
        submitIcon="check"
        onSubmit={(next) => {
          setIsOpen(false);
          onReplace(next);
        }}
      />
    </EuiPopover>
  );
}

/** Free-text search, a row for adding filters, and editable active filter badges. */
export function FilterBar({
  index,
  fields,
  filters,
  search,
  onSearchChange,
  onAddFilter,
  onReplaceFilter,
  onRemoveFilter,
}: FilterBarProps) {
  return (
    <>
      <EuiFieldSearch
        fullWidth
        defaultValue={search}
        key={search}
        placeholder={i18nTexts.searchPlaceholder}
        onSearch={onSearchChange}
        isClearable
        incremental={false}
        data-test-subj="indexExplorerSearch"
      />
      <EuiSpacer size="s" />
      <FilterEditor
        index={index}
        fields={fields}
        submitLabel={i18nTexts.addFilter}
        submitIcon="plusCircle"
        onSubmit={onAddFilter}
      />
      {filters.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {filters.map((filter, position) => (
              <EuiFlexItem grow={false} key={`${filter.field}-${filter.operator}-${position}`}>
                <FilterPill
                  index={index}
                  fields={fields}
                  filter={filter}
                  onReplace={(next) => onReplaceFilter(filter, next)}
                  onRemove={() => onRemoveFilter(filter)}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      ) : null}
    </>
  );
}
