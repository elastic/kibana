/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState, type RefObject } from 'react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSelectable,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import type { RetentionOption } from './types';
import {
  getRetentionSelectableRowTestSubjs,
  RetentionSelectableInspectButton,
  RetentionSelectableRow,
} from './retention_selectable_row';
import { getRetentionSelectorStyles } from './styles';
import { retentionSelectorStrings as strings } from './strings';
import { useFlyoutNestedScrollHeight } from '../hooks/use_flyout_nested_scroll_height';

const NO_FLYOUT_SCROLL_CONTAINER_REF: RefObject<HTMLElement | null> = { current: null };

export interface RetentionSelectorSearchProps {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  searchPlaceholder: string;
  isDisabled?: boolean;
}

/**
 * The search input row, extracted so it can be rendered in a
 * flyout header. Pair with a `showSearch={false}` `RetentionSelector` sharing
 * the same `searchValue`/`onSearchValueChange` to keep the list in sync.
 */
export const RetentionSelectorSearch = ({
  searchValue,
  onSearchValueChange,
  searchPlaceholder,
  isDisabled = false,
}: RetentionSelectorSearchProps) => {
  return (
    <EuiFieldSearch
      placeholder={searchPlaceholder}
      compressed
      fullWidth
      disabled={isDisabled}
      value={searchValue}
      onChange={(event) => onSearchValueChange(event.target.value)}
      data-test-subj="retentionSelectorSearchInput"
      aria-label={searchPlaceholder}
    />
  );
};

interface RetentionSelectableOptionData {
  retentionOption: RetentionOption;
  inspectTestSubj: string;
}

export interface RetentionSelectorProps {
  options: RetentionOption[];
  selectedOptionName?: string;
  onSelectOption: (name: string) => void;
  onInspect?: (name: string) => void;
  isDisabled?: boolean;
  height?: number | 'full';
  showSearch?: boolean;
  listStyle?: 'plain' | 'panel';
  showRowActions?: boolean;
  searchPlaceholder: string;
  inspectButtonLabel: (name: string) => string;
  inspectPlacement?: 'rowAction' | 'badge';
  flyoutScrollContainerRef?: RefObject<HTMLElement | null>;
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
}

export const RetentionSelector = ({
  options,
  selectedOptionName,
  onSelectOption,
  onInspect,
  isDisabled = false,
  height,
  showSearch = true,
  listStyle = 'plain',
  showRowActions = true,
  searchPlaceholder,
  inspectButtonLabel,
  inspectPlacement = 'rowAction',
  flyoutScrollContainerRef,
  searchValue: controlledSearchValue,
  onSearchValueChange,
}: RetentionSelectorProps) => {
  const { euiTheme } = useEuiTheme();
  const [internalSearchValue, setInternalSearchValue] = useState('');
  const searchValue = controlledSearchValue ?? internalSearchValue;
  const setSearchValue = onSearchValueChange ?? setInternalSearchValue;
  const listScrollRef = useRef<HTMLDivElement>(null);
  const nestedScrollHeight = useFlyoutNestedScrollHeight(
    flyoutScrollContainerRef ?? NO_FLYOUT_SCROLL_CONTAINER_REF,
    listScrollRef
  );
  const styles = getRetentionSelectorStyles({ euiTheme });

  const visibleOptions = useMemo(() => {
    const isSearchActive = showSearch || controlledSearchValue !== undefined;
    const normalizedSearchValue = isSearchActive ? searchValue.trim().toLowerCase() : '';
    if (!normalizedSearchValue) return options;

    return options.filter((option) => option.name.toLowerCase().includes(normalizedSearchValue));
  }, [controlledSearchValue, options, searchValue, showSearch]);

  const selectableOptions = useMemo<
    Array<EuiSelectableOption<RetentionSelectableOptionData>>
  >(() => {
    return visibleOptions.map((option) => {
      const { rowTestSubj, inspectTestSubj } = getRetentionSelectableRowTestSubjs(option.name);
      return {
        key: option.name,
        label: option.name,
        checked: option.name === selectedOptionName ? 'on' : undefined,
        disabled: isDisabled,
        'data-test-subj': rowTestSubj,
        retentionOption: option,
        inspectTestSubj,
        prepend: showRowActions ? (
          <EuiIcon
            type={option.name === selectedOptionName ? 'check' : 'empty'}
            size="m"
            aria-hidden
          />
        ) : undefined,
        append:
          option.inspectable && showRowActions && onInspect && inspectPlacement === 'rowAction' ? (
            <RetentionSelectableInspectButton
              inspectButtonLabel={inspectButtonLabel(option.name)}
              inspectTestSubj={inspectTestSubj}
              onInspect={() => onInspect(option.name)}
              isDisabled={isDisabled}
            />
          ) : undefined,
      };
    });
  }, [
    inspectButtonLabel,
    inspectPlacement,
    isDisabled,
    onInspect,
    selectedOptionName,
    showRowActions,
    visibleOptions,
  ]);

  const selectableHeight = height === 'full' ? nestedScrollHeight : height;

  const list =
    visibleOptions.length > 0 ? (
      <EuiSelectable
        aria-label={strings.listAriaLabel}
        options={selectableOptions}
        isPreFiltered
        height={selectableHeight}
        css={styles.selectable}
        listProps={{
          isVirtualized: false,
          showIcons: false,
          textWrap: 'wrap',
          bordered: false,
        }}
        onChange={(_newOptions, _event, changedOption) => {
          if (!isDisabled) onSelectOption(changedOption.label);
        }}
        renderOption={(option, optionSearchValue) => (
          <RetentionSelectableRow
            option={option.retentionOption}
            searchValue={optionSearchValue || searchValue}
            inspectButtonLabel={inspectButtonLabel(option.label)}
            inspectTestSubj={option.inspectTestSubj}
            onInspect={onInspect ? () => onInspect(option.label) : undefined}
            isDisabled={isDisabled}
            inspectPlacement={inspectPlacement}
          />
        )}
      >
        {(selectableList) => <>{selectableList}</>}
      </EuiSelectable>
    ) : (
      <EuiText color="subdued" size="s" css={styles.noOptionsText}>
        {strings.noOptionsFoundDescription}
      </EuiText>
    );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      {showSearch && (
        <EuiFlexItem grow={false} css={styles.paddedSection}>
          <RetentionSelectorSearch
            searchValue={searchValue}
            onSearchValueChange={setSearchValue}
            searchPlaceholder={searchPlaceholder}
            isDisabled={isDisabled}
          />
        </EuiFlexItem>
      )}
      {listStyle === 'panel' ? (
        <EuiFlexItem grow={false} css={styles.paddedSection}>
          <EuiPanel hasBorder paddingSize="none" css={styles.panelListPanel} disabled={isDisabled}>
            {list}
          </EuiPanel>
        </EuiFlexItem>
      ) : (
        <EuiFlexItem
          grow={false}
          ref={listScrollRef}
          data-test-subj="retentionSelectorListScroll"
          css={styles.paddedSection}
        >
          {list}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
