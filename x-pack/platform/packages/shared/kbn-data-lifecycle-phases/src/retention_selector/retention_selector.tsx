/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { RetentionOption } from './types';
import { RetentionSelectableRow } from './retention_selectable_row';
import { getRetentionSelectorStyles } from './styles';
import { retentionSelectorStrings as strings } from './strings';
import { useFlyoutNestedScrollHeight } from '../hooks/use_flyout_nested_scroll_height';

const NO_FLYOUT_SCROLL_CONTAINER_REF: RefObject<HTMLElement | null> = { current: null };

export type RetentionSelectorMethod = string;

export interface RetentionSelectorMethodOption {
  key: RetentionSelectorMethod;
  label: string;
}

export interface RetentionSelectorMethodFilterConfig {
  /**
   * Selected methods. Empty means "all methods".
   */
  selectedMethods: RetentionSelectorMethod[];
  onChangeSelectedMethods: (nextSelectedMethods: RetentionSelectorMethod[]) => void;
  /**
   * Optional custom method derivation. Defaults to `option.method`.
   *
   * Note: pass a stable function reference (e.g. `useCallback`) to avoid
   * unnecessary recomputation when the parent re-renders.
   */
  getMethodForOption?: (option: RetentionOption) => RetentionSelectorMethod | undefined;
  /**
   * Optional list of selectable methods.
   *
   * When omitted, options will be derived from the provided `options` list
   * using `getMethodForOption` (or `option.method` by default).
   */
  methodOptions?: RetentionSelectorMethodOption[];
  /** Optional label override for the filter button. */
  buttonLabel?: string;
}

export interface RetentionSelectorProps {
  options: RetentionOption[];
  selectedOptionName?: string;
  onSelectOption: (name: string) => void;
  onInspect?: (name: string) => void;
  isDisabled?: boolean;
  height?: number | 'full';
  /** Hide the search input (useful when the list is read-only / single item). */
  showSearch?: boolean;
  /** Render the list inside a panel (used for read-only single-row display). */
  listStyle?: 'plain' | 'panel';
  /** Hide selection + inspect affordances (used for read-only single-row display). */
  showRowActions?: boolean;
  searchPlaceholder: string;
  inspectButtonLabel: (name: string) => string;
  /**
   * Optional method/category filter rendered next to the search input.
   */
  methodFilter?: RetentionSelectorMethodFilterConfig;
  /**
   * Where the inspect affordance is rendered.
   * - `rowAction`: right-side action icon (default)
   * - `badge`: inside the row badge (Streams import flyout)
   */
  inspectPlacement?: 'rowAction' | 'badge';
  /**
   * When provided with `height="full"`, the list gets a fixed nested scroll
   * height while the surrounding `EuiFlyoutBody` keeps its own scroll.
   */
  flyoutScrollContainerRef?: RefObject<HTMLElement | null>;
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
  methodFilter,
  inspectPlacement = 'rowAction',
  flyoutScrollContainerRef,
}: RetentionSelectorProps) => {
  const { euiTheme } = useEuiTheme();
  const [searchValue, setSearchValue] = useState('');
  const [isMethodFilterPopoverOpen, setIsMethodFilterPopoverOpen] = useState(false);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const nestedScrollHeight = useFlyoutNestedScrollHeight(
    flyoutScrollContainerRef ?? NO_FLYOUT_SCROLL_CONTAINER_REF,
    listScrollRef
  );
  const styles = getRetentionSelectorStyles({
    euiTheme,
    height,
    nestedScrollHeight: height === 'full' ? nestedScrollHeight : undefined,
  });

  const defaultGetMethodForOption = useCallback(
    (option: RetentionOption): RetentionSelectorMethod | undefined => option.method,
    []
  );

  const getMethodForOption = methodFilter?.getMethodForOption ?? defaultGetMethodForOption;

  const selectableMethodOptions = useMemo<RetentionSelectorMethodOption[]>(() => {
    if (!methodFilter) return [];
    if (methodFilter.methodOptions) return methodFilter.methodOptions;

    const uniqueKeys = Array.from(
      new Set(
        options
          .map((option) => getMethodForOption(option))
          .filter((k): k is RetentionSelectorMethod => Boolean(k && k.trim()))
      )
    );

    return uniqueKeys.map((key) => ({ key, label: key }));
  }, [getMethodForOption, methodFilter, options]);

  const methodFilteredOptions = useMemo(() => {
    const selectedMethods = methodFilter?.selectedMethods ?? [];
    if (selectedMethods.length === 0) return options;
    return options.filter((option) => {
      const method = getMethodForOption(option);
      return method ? selectedMethods.includes(method) : false;
    });
  }, [getMethodForOption, methodFilter?.selectedMethods, options]);

  const visibleOptions = useMemo(() => {
    const normalizedSearchValue = showSearch ? searchValue.trim().toLowerCase() : '';
    if (!normalizedSearchValue) return methodFilteredOptions;

    return methodFilteredOptions.filter((option) =>
      option.name.toLowerCase().includes(normalizedSearchValue)
    );
  }, [methodFilteredOptions, searchValue, showSearch]);

  const selectedMethodCount = methodFilter?.selectedMethods.length ?? 0;

  const methodFilterControl =
    methodFilter && selectableMethodOptions.length > 0 ? (
      <EuiFilterGroup compressed>
        <EuiPopover
          aria-label={strings.methodFilterPopoverAriaLabel}
          isOpen={isDisabled ? false : isMethodFilterPopoverOpen}
          closePopover={() => setIsMethodFilterPopoverOpen(false)}
          panelPaddingSize="s"
          button={
            <EuiFilterButton
              iconType="chevronSingleDown"
              isSelected={isMethodFilterPopoverOpen}
              onClick={() => setIsMethodFilterPopoverOpen((open) => !open)}
              isDisabled={isDisabled}
              hasActiveFilters={selectedMethodCount > 0}
              numActiveFilters={selectedMethodCount > 0 ? selectedMethodCount : undefined}
              data-test-subj="retentionSelectorMethodFilterButton"
            >
              {methodFilter.buttonLabel ?? strings.methodFilterButtonLabel}
            </EuiFilterButton>
          }
        >
          <EuiSelectable
            aria-label={strings.methodFilterSelectableAriaLabel}
            options={selectableMethodOptions.map(({ key, label }) => ({
              key,
              label,
              checked: methodFilter.selectedMethods.includes(key) ? ('on' as const) : undefined,
            }))}
            listProps={{ isVirtualized: false, textWrap: 'wrap' }}
            onChange={(newOptions) => {
              const nextSelected = newOptions
                .filter((o) => o.checked === 'on')
                .map((o) => o.key as RetentionSelectorMethod);
              methodFilter.onChangeSelectedMethods(nextSelected);
            }}
          >
            {(list) => <>{list}</>}
          </EuiSelectable>
        </EuiPopover>
      </EuiFilterGroup>
    ) : null;

  const list =
    visibleOptions.length > 0 ? (
      <EuiListGroup maxWidth={false} wrapText css={styles.list}>
        {visibleOptions.map((option) => (
          <RetentionSelectableRow
            key={option.name}
            option={option}
            searchValue={searchValue}
            inspectButtonLabel={inspectButtonLabel(option.name)}
            onSelect={() => {
              if (!isDisabled) onSelectOption(option.name);
            }}
            onInspect={onInspect ? () => onInspect(option.name) : undefined}
            isSelected={option.name === selectedOptionName}
            isDisabled={isDisabled}
            showSelectionIcon={showRowActions}
            showInspectAction={showRowActions && onInspect !== undefined}
            inspectPlacement={inspectPlacement}
          />
        ))}
      </EuiListGroup>
    ) : (
      <EuiText color="subdued" size="s" css={styles.noOptionsText}>
        {strings.noOptionsFoundDescription}
      </EuiText>
    );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      {showSearch && (
        <EuiFlexItem grow={false} css={styles.paddedSection}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiFieldSearch
                placeholder={searchPlaceholder}
                compressed
                fullWidth
                disabled={isDisabled}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                data-test-subj="retentionSelectorSearchInput"
                aria-label={searchPlaceholder}
              />
            </EuiFlexItem>
            {methodFilterControl ? (
              <EuiFlexItem grow={false}>{methodFilterControl}</EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
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
          css={styles.scrollContainer}
          data-test-subj="retentionSelectorListScroll"
        >
          {list}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
