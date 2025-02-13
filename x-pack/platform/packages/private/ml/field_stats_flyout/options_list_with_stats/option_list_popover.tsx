/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useMemo, useState, useEffect } from 'react';
import { isDefined } from '@kbn/ml-is-defined';
import type {
  EuiComboBoxOptionOption,
  EuiComboBoxSingleSelectionShape,
  EuiSelectableOption,
} from '@elastic/eui';
import { EuiFlexItem, EuiSelectable, htmlIdGenerator } from '@elastic/eui';
import { css } from '@emotion/react';
import { type DropDownLabel } from './types';
import { useFieldStatsFlyoutContext } from '../use_field_stats_flyout_context';
import { OptionsListPopoverFooter } from './option_list_popover_footer';

interface OptionsListPopoverProps {
  options: DropDownLabel[];
  renderOption: (option: DropDownLabel) => React.ReactNode;
  singleSelection?: boolean | EuiComboBoxSingleSelectionShape;
  onChange?:
    | ((newSuggestions: DropDownLabel[]) => void)
    | ((
        newSuggestions: Array<EuiComboBoxOptionOption<string | number | string[] | undefined>>
      ) => void);
  setPopoverOpen: (open: boolean) => void;
  isLoading?: boolean;
}

interface OptionsListPopoverSuggestionsProps {
  options: DropDownLabel[];
  renderOption: (option: DropDownLabel) => React.ReactNode;
  singleSelection?: boolean | EuiComboBoxSingleSelectionShape;
  onChange?:
    | ((newSuggestions: DropDownLabel[]) => void)
    | ((
        newSuggestions: Array<EuiComboBoxOptionOption<string | number | string[] | undefined>>
      ) => void);
  setPopoverOpen: (open: boolean) => void;
}
const OptionsListPopoverSuggestions: FC<OptionsListPopoverSuggestionsProps> = ({
  options,
  renderOption,
  singleSelection,
  onChange,
  setPopoverOpen,
}) => {
  const [selectableOptions, setSelectableOptions] = useState<DropDownLabel[]>([]); // will be set in following useEffect
  useEffect(() => {
    /* This useEffect makes selectableOptions responsive to search, show only selected, and clear selections */
    const _selectableOptions = (options ?? []).map((suggestion) => {
      const key = suggestion.label ?? suggestion.field?.id;
      return {
        ...suggestion,
        key,
        checked: undefined,
        'data-test-subj': `optionsListControlSelection-${key}`,
      };
    });
    setSelectableOptions(_selectableOptions);
  }, [options]);

  return (
    <EuiSelectable
      searchProps={{ 'data-test-subj': 'optionsListFilterInput' }}
      singleSelection={Boolean(singleSelection)}
      searchable
      options={selectableOptions as Array<EuiSelectableOption<string>>}
      renderOption={renderOption}
      listProps={{ onFocusBadge: false }}
      onChange={(opts, _, changedOption) => {
        const option = changedOption as DropDownLabel;
        if (singleSelection) {
          if (onChange) {
            onChange([option as EuiComboBoxOptionOption<string | number | string[] | undefined>]);
            setPopoverOpen(false);
          }
        } else {
          if (onChange) {
            onChange([option as EuiComboBoxOptionOption<string | number | string[] | undefined>]);
            setPopoverOpen(false);
          }
        }
      }}
    >
      {(list, search) => (
        <>
          {search}
          {list}
        </>
      )}
    </EuiSelectable>
  );
};

export const OptionsListPopover = ({
  options,
  renderOption,
  singleSelection,
  onChange,
  setPopoverOpen,
  isLoading,
}: OptionsListPopoverProps) => {
  const { populatedFields } = useFieldStatsFlyoutContext();

  const [showEmptyFields, setShowEmptyFields] = useState(
    populatedFields ? !(populatedFields.size > 0) : true
  );
  const id = useMemo(() => htmlIdGenerator()(), []);

  const filteredOptions = useMemo(() => {
    return showEmptyFields
      ? options
      : options.filter((option) => {
          if (isDefined(option['data-is-empty'])) {
            return !option['data-is-empty'];
          }
          if (
            Object.hasOwn(option, 'isGroupLabel') ||
            Object.hasOwn(option, 'isGroupLabelOption')
          ) {
            const key = option.key ?? option.searchableLabel;
            return key ? populatedFields?.has(key) : false;
          }
          if (option.field) {
            return populatedFields?.has(option.field.id);
          }
          return true;
        });
  }, [options, showEmptyFields, populatedFields]);
  return (
    <div
      id={`control-popover-${id}`}
      className={'optionsList__popover'}
      data-test-subj={`optionsListControlPopover`}
    >
      <EuiFlexItem
        data-test-subj={`optionsListControlAvailableOptions`}
        css={css({ width: '100%', height: '100%' })}
      >
        <OptionsListPopoverSuggestions
          renderOption={renderOption}
          options={filteredOptions}
          singleSelection={singleSelection}
          onChange={onChange}
          setPopoverOpen={setPopoverOpen}
        />
      </EuiFlexItem>
      <OptionsListPopoverFooter
        showEmptyFields={showEmptyFields}
        setShowEmptyFields={setShowEmptyFields}
        isLoading={isLoading}
      />
    </div>
  );
};
