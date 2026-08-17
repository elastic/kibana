/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption, IconType, UseEuiTheme } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiSelectable,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useCasesFieldLibraryNavigation } from '../../../../common/navigation';
import { flattenOptions } from './get_action_options';
import type { ActionOptionData, ConfigurableFieldAction } from './types';
import { getOptionAction, isActionCategory, isConfigurableFieldAction } from './types';
import { useDisplayOptions } from './use_display_options';
import * as i18nStrings from '../../translations';

const SEARCH_INPUT_NAME = 'cases-actions-menu-search';
const LIST_SLIDE_MS = 220;
const KEYBOARD_ACTIVE_CLASS = 'actionsMenu-keyboardActive';
const QUICK_ACTIONS_CLASS = 'actionsMenu-quickActions';

type PendingListFocus = 'first' | 'none' | { optionId: string };

export type ActionsMenuPresentation = 'full' | 'compact';

export interface ActionsMenuProps {
  options: ActionOptionData[];
  testSubjPrefix: string;
  onActionSelected: (action: ActionOptionData) => void;
  onClose?: () => void;
  /**
   * Opens Configure and add for a New field / Field library leaf. Omitted in compact mode.
   */
  onConfigure?: (action: ConfigurableFieldAction) => void;
  /** Keep the menu mounted (preserving drill-in state) while a configure modal is open. */
  isHidden?: boolean;
  /**
   * `full` — template editor: search and category headers.
   * `compact` — field-library flyout: same rows and selection, no search or group labels.
   */
  presentation?: ActionsMenuPresentation;
}

const getActionableDisplayOptions = (options: EuiSelectableOption[]): EuiSelectableOption[] =>
  options.filter((option) => !option.isGroupLabel && !option.disabled);

const getOptionId = (option: EuiSelectableOption): string | undefined =>
  getOptionAction(option)?.id ?? (option as { id?: string }).id ?? option.key;

const getNavDirection = (fromPath: string[], toPath: string[]): 'forward' | 'back' => {
  const isPrefix = fromPath.length <= toPath.length && fromPath.every((id, i) => id === toPath[i]);
  if (isPrefix) return 'forward';
  const isAncestor = toPath.length < fromPath.length && toPath.every((id, i) => id === fromPath[i]);
  if (isAncestor) return 'back';
  return toPath.length >= fromPath.length ? 'forward' : 'back';
};

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const resolvePathLabels = (
  path: string[],
  rootOptions: ActionOptionData[]
): Array<{ id: string; label: string }> => {
  const labels: Array<{ id: string; label: string }> = [];
  let current = rootOptions;
  for (const id of path) {
    const found = current.find((o) => o.id === id);
    if (!found) break;
    labels.push({ id, label: found.label });
    if (isActionCategory(found)) {
      current = found.options;
    } else {
      break;
    }
  }
  return labels;
};

export function ActionsMenu({
  options: defaultOptions,
  testSubjPrefix,
  onActionSelected,
  onClose,
  onConfigure,
  isHidden = false,
  presentation = 'full',
}: ActionsMenuProps) {
  const isFull = presentation === 'full';
  const isHiddenRef = useRef(isHidden);
  isHiddenRef.current = isHidden;
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const listViewportRef = useRef<HTMLDivElement | null>(null);
  const listPaneRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [lockedBodyHeight, setLockedBodyHeight] = useState<number | null>(null);
  const isSlidingRef = useRef(false);
  const pendingListFocusRef = useRef<PendingListFocus | null>(null);
  const keyboardIndexRef = useRef<number | null>(null);

  const flatOptions = useMemo(() => flattenOptions(defaultOptions), [defaultOptions]);

  const [options, setOptions] = useState<ActionOptionData[]>(defaultOptions);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);
  keyboardIndexRef.current = keyboardIndex;

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  const focusMenu = useCallback(() => {
    menuContainerRef.current?.focus({ preventScroll: true });
  }, []);

  const clearKeyboardSelection = useCallback(() => {
    setKeyboardIndex(null);
  }, []);

  useEffect(() => {
    if (isFull) {
      focusSearch();
    } else {
      focusMenu();
    }
  }, [focusSearch, focusMenu, isFull]);

  const keepSearchFocused = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(`input[name="${SEARCH_INPUT_NAME}"]`) || target.closest('button')) {
      return;
    }
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (currentPath.length === 0) {
      setOptions(defaultOptions);
      return;
    }
    let nextOptions = defaultOptions;
    for (const id of currentPath) {
      const next = nextOptions.find((o) => o.id === id);
      if (next && isActionCategory(next)) {
        nextOptions = next.options;
      } else {
        nextOptions = [];
      }
    }
    setOptions(nextOptions);
  }, [defaultOptions, currentPath]);

  const displayOptions = useDisplayOptions({
    options,
    categoryTree: defaultOptions,
    searchTerm: isFull ? searchTerm : '',
    currentPath,
    testSubjPrefix,
    showSectionLabels: isFull,
  });

  const actionableDisplayOptions = useMemo(
    () => getActionableDisplayOptions(displayOptions),
    [displayOptions]
  );
  const actionableDisplayOptionsRef = useRef(actionableDisplayOptions);
  actionableDisplayOptionsRef.current = actionableDisplayOptions;
  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;

  const setKeyboardIndexAndPreview = useCallback((index: number | null) => {
    setKeyboardIndex(index);
  }, []);

  useEffect(() => {
    const pending = pendingListFocusRef.current;
    if (pending == null || pending === 'none') {
      if (pending === 'none') pendingListFocusRef.current = null;
      return;
    }
    pendingListFocusRef.current = null;
    const actionable = getActionableDisplayOptions(displayOptions);
    if (pending === 'first') {
      setKeyboardIndexAndPreview(actionable.length === 0 ? null : 0);
      return;
    }
    const idx = actionable.findIndex((option) => getOptionId(option) === pending.optionId);
    setKeyboardIndexAndPreview(idx >= 0 ? idx : null);
  }, [displayOptions, currentPath, setKeyboardIndexAndPreview]);

  useEffect(() => {
    if (keyboardIndex == null) return;
    const active = menuContainerRef.current?.querySelector(`.${KEYBOARD_ACTIVE_CLASS}`);
    active?.closest('.euiSelectableListItem')?.scrollIntoView({ block: 'nearest' });
  }, [keyboardIndex, currentPath]);

  const isSearching = isFull && searchTerm.trim().length > 0;
  const hasActionableItems = displayOptions.some((o) => !o.isGroupLabel);
  const showNoResults = isSearching && !hasActionableItems;
  const showEmptyCategory = !isSearching && currentPath.length > 0 && options.length === 0;
  const showBack = currentPath.length > 0 && !isSearching;
  const isFieldLibraryDrillIn = currentPath[0] === 'fieldLibrary' && !isSearching;

  useLayoutEffect(() => {
    if (!isFull || currentPath.length > 0 || isSearching || lockedBodyHeight != null) {
      return;
    }
    const height = bodyRef.current?.getBoundingClientRect().height;
    if (height && height > 0) {
      setLockedBodyHeight(height);
    }
  }, [isFull, currentPath.length, isSearching, lockedBodyHeight, displayOptions]);

  const handleListMouseMove = useCallback(() => {
    if (keyboardIndexRef.current != null) {
      setKeyboardIndex(null);
    }
  }, []);

  const navigateToPath = useCallback(
    (nextPath: string[], pendingFocus: PendingListFocus = 'none') => {
      pendingListFocusRef.current = pendingFocus;
      const applyNavigation = () => {
        let nextOptions: ActionOptionData[] = defaultOptions;
        for (const id of nextPath) {
          const nextOption = nextOptions.find((option) => option.id === id);
          if (nextOption && isActionCategory(nextOption)) {
            nextOptions = nextOption.options;
          } else {
            nextOptions = [];
          }
        }
        setCurrentPath(nextPath);
        setOptions(nextOptions);
        setKeyboardIndex(null);
      };

      const pathUnchanged =
        nextPath.length === currentPath.length && nextPath.every((id, i) => id === currentPath[i]);
      if (pathUnchanged) {
        applyNavigation();
        return;
      }

      const viewport = listViewportRef.current;
      const pane = listPaneRef.current;
      if (
        !viewport ||
        !pane ||
        prefersReducedMotion() ||
        isSlidingRef.current ||
        viewport.clientWidth === 0
      ) {
        applyNavigation();
        return;
      }

      const direction = getNavDirection(currentPath, nextPath);
      isSlidingRef.current = true;

      const outgoing = pane.cloneNode(true) as HTMLElement;
      outgoing.setAttribute('aria-hidden', 'true');
      outgoing.style.position = 'absolute';
      outgoing.style.inset = '0';
      outgoing.style.width = '100%';
      outgoing.style.height = '100%';
      outgoing.style.zIndex = '1';
      outgoing.style.pointerEvents = 'none';
      outgoing.style.backgroundColor = euiTheme.colors.backgroundBasePlain;
      viewport.appendChild(outgoing);

      pane.style.transition = 'none';
      pane.style.transform = direction === 'forward' ? 'translateX(100%)' : 'translateX(-100%)';
      applyNavigation();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const transition = `transform ${LIST_SLIDE_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
          outgoing.style.transition = transition;
          pane.style.transition = transition;
          outgoing.style.transform =
            direction === 'forward' ? 'translateX(-100%)' : 'translateX(100%)';
          pane.style.transform = 'translateX(0)';

          let cleaned = false;
          const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            outgoing.remove();
            pane.style.transition = '';
            pane.style.transform = '';
            isSlidingRef.current = false;
          };
          outgoing.addEventListener('transitionend', cleanup, { once: true });
          window.setTimeout(cleanup, LIST_SLIDE_MS + 80);
        });
      });
    },
    [currentPath, defaultOptions, euiTheme.colors.backgroundBasePlain]
  );

  const goBack = useCallback(() => {
    const path = currentPathRef.current;
    if (path.length === 0) return;
    const exitedId = path[path.length - 1];
    navigateToPath(path.slice(0, -1), { optionId: exitedId });
  }, [navigateToPath]);

  const handleStepOrGroupSelected = useCallback(
    (action: ActionOptionData) => {
      if (action.disabled) return;
      if (isActionCategory(action)) {
        const nextPath = action.pathIds ?? [...currentPath, action.id];
        setSearchTerm('');
        navigateToPath([...nextPath], 'none');
      } else {
        onActionSelected(action);
      }
    },
    [currentPath, navigateToPath, onActionSelected]
  );

  const resolveRowIcon = useCallback(
    (action: ActionOptionData): IconType => {
      if (action.iconType) {
        return action.iconType;
      }
      const parentId = action.pathIds?.[action.pathIds.length - 2];
      const parent = parentId ? flatOptions.find((o) => o.id === parentId) : undefined;
      return parent?.iconType ?? 'dot';
    },
    [flatOptions]
  );

  const renderActionOption = (rawOption: EuiSelectableOption, searchValue: string) => {
    const action = getOptionAction(rawOption);
    const effectiveSearch = (searchTerm || searchValue).trim();
    const keyboardOption =
      keyboardIndex != null ? actionableDisplayOptions[keyboardIndex] : undefined;
    const isKeyboardActive =
      keyboardOption != null &&
      getOptionId(keyboardOption) != null &&
      getOptionId(keyboardOption) === getOptionId(rawOption);
    const keyboardActiveClassName = isKeyboardActive ? KEYBOARD_ACTIVE_CLASS : undefined;

    if (!action) {
      return (
        <div css={styles.actionOptionWrapper} className={keyboardActiveClassName}>
          <EuiHighlight search={effectiveSearch}>{rawOption.label}</EuiHighlight>
        </div>
      );
    }

    const isCategory = isActionCategory(action);
    const description = action.disabledReason ?? action.description;
    const iconType = resolveRowIcon(action);
    const showChevron = isCategory && !action.disabled;
    const showQuickActions =
      isFull && onConfigure != null && isConfigurableFieldAction(action) && !action.disabled;

    const stopRowActivation = (event: React.SyntheticEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    return (
      <div
        css={styles.actionOptionWrapper}
        className={keyboardActiveClassName}
        data-option-id={action.id}
      >
        <EuiFlexGroup
          alignItems="center"
          css={styles.actionOption}
          gutterSize="none"
          responsive={false}
        >
          <EuiFlexItem grow={false} css={[styles.iconOuter, styles.iconOuterNeutral]}>
            <span css={styles.actionIconInner}>
              <EuiIcon type={iconType} size="m" color={euiTheme.colors.textParagraph} aria-hidden />
            </span>
          </EuiFlexItem>
          <EuiFlexItem css={styles.actionInfo}>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <span css={styles.actionTitle}>
                  <EuiHighlight search={effectiveSearch} highlightAll>
                    {rawOption.label}
                  </EuiHighlight>
                </span>
              </EuiFlexItem>
              {description ? (
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued" css={styles.actionDescription}>
                    <EuiHighlight search={effectiveSearch} highlightAll>
                      {description}
                    </EuiHighlight>
                  </EuiText>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
          {action.kind === 'libraryField' && action.isGlobal ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{i18nStrings.ACTIONS_MENU_LIBRARY_GLOBAL_BADGE}</EuiBadge>
            </EuiFlexItem>
          ) : null}
          {showChevron ? (
            <EuiFlexItem grow={false} css={styles.arrowContainer}>
              <EuiIcon
                type="chevronSingleRight"
                size="s"
                css={styles.arrow}
                aria-hidden
                data-test-subj={
                  action.testSubj ? `${testSubjPrefix}-${action.testSubj}-chevron` : undefined
                }
              />
            </EuiFlexItem>
          ) : null}
          {showQuickActions ? (
            <EuiFlexItem grow={false}>
              <div className={QUICK_ACTIONS_CLASS} css={styles.quickActions}>
                <EuiToolTip
                  content={i18nStrings.ACTIONS_MENU_CONFIGURE_AND_ADD}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    color="text"
                    iconType="controls"
                    size="s"
                    aria-label={i18nStrings.ACTIONS_MENU_CONFIGURE_AND_ADD}
                    onMouseDown={stopRowActivation}
                    onClick={(event: React.MouseEvent) => {
                      stopRowActivation(event);
                      onConfigure(action);
                    }}
                    data-test-subj={
                      action.testSubj ? `${testSubjPrefix}-${action.testSubj}-configure` : undefined
                    }
                  />
                </EuiToolTip>
                <EuiToolTip content={i18nStrings.ACTIONS_MENU_QUICK_ADD} disableScreenReaderOutput>
                  <EuiButtonIcon
                    color="text"
                    display="base"
                    iconType="plusCircle"
                    size="s"
                    aria-label={i18nStrings.ACTIONS_MENU_QUICK_ADD}
                    onMouseDown={stopRowActivation}
                    onClick={(event: React.MouseEvent) => {
                      stopRowActivation(event);
                      onActionSelected(action);
                    }}
                    data-test-subj={
                      action.testSubj ? `${testSubjPrefix}-${action.testSubj}-add` : undefined
                    }
                  />
                </EuiToolTip>
              </div>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </div>
    );
  };

  const handleChange = (
    _updatedOptions: EuiSelectableOption[],
    _event: React.BaseSyntheticEvent,
    selectedOption: EuiSelectableOption
  ) => {
    const action = getOptionAction(selectedOption);
    if (action) {
      handleStepOrGroupSelected(action);
    }
  };

  const handleChangeRef = useRef(handleChange);
  handleChangeRef.current = handleChange;

  const enterCategoryFromKeyboard = useCallback(() => {
    const index = keyboardIndexRef.current;
    if (index == null) return;
    const option = actionableDisplayOptionsRef.current[index];
    const action = option ? getOptionAction(option) : undefined;
    if (!action || !isActionCategory(action) || action.disabled) return;
    const nextPath = action.pathIds ?? [...currentPathRef.current, action.id];
    setSearchTerm('');
    navigateToPath([...nextPath], 'first');
  }, [navigateToPath]);

  const activateKeyboardOption = useCallback(() => {
    const index = keyboardIndexRef.current;
    if (index == null) return;
    const option = actionableDisplayOptionsRef.current[index];
    if (!option) return;
    const action = getOptionAction(option);
    if (action && isActionCategory(action)) {
      enterCategoryFromKeyboard();
      return;
    }
    handleChangeRef.current([], {} as React.BaseSyntheticEvent, option);
  }, [enterCategoryFromKeyboard]);

  const handleSearchChange = (searchValue: string) => {
    setSearchTerm(searchValue);
    setKeyboardIndex(null);
    if (searchValue.length > 0) {
      setCurrentPath([]);
    }
    if (searchValue.length === 0) {
      setOptions(defaultOptions);
    }
  };

  const handleSearchChangeRef = useRef(handleSearchChange);
  handleSearchChangeRef.current = handleSearchChange;
  const setKeyboardIndexAndPreviewRef = useRef(setKeyboardIndexAndPreview);
  setKeyboardIndexAndPreviewRef.current = setKeyboardIndexAndPreview;
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;

  useEffect(() => {
    if (isHidden) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const menuEl = menuContainerRef.current;
      if (!menuEl || !document.body.contains(menuEl)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const activeEl = document.activeElement;
      if (
        (e.key === 'Enter' || e.key === ' ') &&
        activeEl instanceof HTMLElement &&
        menuEl.contains(activeEl) &&
        activeEl.closest('button')
      ) {
        return;
      }

      const input = searchInputRef.current;
      if (!menuEl.contains(document.activeElement) && document.activeElement !== input) {
        if (!menuEl.contains(e.target as Node)) return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (currentPathRef.current.length > 0) {
          goBackRef.current();
          return;
        }
        onClose?.();
        return;
      }

      const actionable = actionableDisplayOptionsRef.current;
      const isSearchFocused = Boolean(input) && document.activeElement === input;
      const keyboardIdx = keyboardIndexRef.current;
      const inListNavMode = keyboardIdx != null;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (actionable.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        if (!inListNavMode) {
          setKeyboardIndexAndPreviewRef.current(e.key === 'ArrowDown' ? 0 : actionable.length - 1);
          return;
        }
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const next = (keyboardIdx + delta + actionable.length) % actionable.length;
        setKeyboardIndexAndPreviewRef.current(next);
        return;
      }

      if (e.key === 'ArrowRight') {
        if (!inListNavMode) return;
        e.preventDefault();
        e.stopPropagation();
        enterCategoryFromKeyboard();
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (!inListNavMode && currentPathRef.current.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        goBackRef.current();
        return;
      }

      if (e.key === 'Enter' && inListNavMode) {
        e.preventDefault();
        e.stopPropagation();
        activateKeyboardOption();
        return;
      }

      if (!isFull || !input) return;
      if (isSearchFocused && !inListNavMode) return;

      const isPrintable = e.key.length === 1;
      if (!isPrintable && e.key !== 'Backspace' && e.key !== 'Delete') return;

      e.preventDefault();
      e.stopPropagation();
      clearKeyboardSelection();
      focusSearch();

      if (isPrintable) {
        handleSearchChangeRef.current(`${input.value}${e.key}`);
      } else if (e.key === 'Backspace') {
        handleSearchChangeRef.current(input.value.slice(0, -1));
      } else if (e.key === 'Delete') {
        handleSearchChangeRef.current('');
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [
    activateKeyboardOption,
    clearKeyboardSelection,
    enterCategoryFromKeyboard,
    focusSearch,
    isFull,
    isHidden,
    onClose,
  ]);

  const pathLabels = useMemo(
    () => resolvePathLabels(currentPath, defaultOptions),
    [currentPath, defaultOptions]
  );

  const headerTitle =
    !isSearching && pathLabels.length > 0
      ? pathLabels[pathLabels.length - 1].label
      : i18nStrings.ACTIONS_MENU_ROOT_TITLE;

  const closeAriaLabel = i18n.translate('xpack.cases.templates.actionsMenu.close', {
    defaultMessage: 'Close actions menu',
  });

  const backButton = (
    <EuiToolTip content={i18nStrings.ACTIONS_MENU_BACK} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="chevronSingleLeft"
        size="s"
        color="text"
        aria-label={i18nStrings.ACTIONS_MENU_BACK}
        aria-hidden={!showBack}
        tabIndex={showBack ? 0 : -1}
        onClick={goBack}
        data-test-subj={`${testSubjPrefix}-back`}
      />
    </EuiToolTip>
  );

  // Compact: no expanding slot — animating the title sideways is awkward.
  const backControl = isFull ? (
    <div css={[styles.backSlot, showBack && styles.backSlotVisible]}>{backButton}</div>
  ) : showBack ? (
    backButton
  ) : null;

  return (
    <EuiSelectable
      aria-label={headerTitle}
      searchable
      options={displayOptions}
      onChange={handleChange}
      optionMatcher={() => true}
      searchProps={{
        id: 'cases-actions-menu-search',
        name: SEARCH_INPUT_NAME,
        placeholder: i18nStrings.ACTIONS_MENU_SEARCH_PLACEHOLDER,
        value: searchTerm,
        onChange: handleSearchChange,
        compressed: true,
        isClearable: true,
        'data-test-subj': `${testSubjPrefix}-search`,
        inputRef: (node: HTMLInputElement | null) => {
          searchInputRef.current = node;
        },
        onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
          if (isHiddenRef.current) {
            return;
          }
          const next = e.relatedTarget as Node | null;
          const menuEl = menuContainerRef.current;
          if (menuEl && next && menuEl.contains(next)) {
            return;
          }
          requestAnimationFrame(() => {
            if (isHiddenRef.current) {
              return;
            }
            if (searchInputRef.current && document.body.contains(searchInputRef.current)) {
              const active = document.activeElement;
              if (menuContainerRef.current?.contains(active)) {
                return;
              }
              focusSearch();
            }
          });
        },
      }}
      listProps={{
        showIcons: false,
        paddingSize: 'none',
        onFocusBadge: false,
        // Two-line rows (title + description); keep virtualization off so height isn't clipped.
        isVirtualized: false,
        'data-test-subj': `${testSubjPrefix}Panels`,
      }}
      renderOption={renderActionOption}
      css={styles.selectable}
      singleSelection
    >
      {(list, search) => (
        <div
          ref={menuContainerRef}
          css={[styles.container, !isFull && styles.containerCompact]}
          onMouseDown={isFull ? keepSearchFocused : undefined}
          data-test-subj={`${testSubjPrefix}Content`}
          tabIndex={isFull ? undefined : -1}
        >
          <div css={styles.header}>
            <div css={styles.titleRow}>
              <div css={styles.titleCluster}>
                {!isFull ? backControl : null}
                <EuiTitle size="xxs">
                  <h3 css={styles.title}>{headerTitle}</h3>
                </EuiTitle>
              </div>
              {onClose && (
                <EuiToolTip content={closeAriaLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="cross"
                    size="s"
                    color="text"
                    aria-label={closeAriaLabel}
                    onClick={onClose}
                    css={styles.closeButton}
                    data-test-subj={`${testSubjPrefix}-close`}
                  />
                </EuiToolTip>
              )}
            </div>
            {isFull ? (
              <div css={[styles.searchRow, showBack && styles.searchRowWithBack]}>
                {backControl}
                <div css={styles.searchField}>{search}</div>
              </div>
            ) : null}
          </div>

          <div
            ref={bodyRef}
            css={[styles.body, isFull ? styles.bodyFull : styles.bodyCompact]}
            style={isFull && lockedBodyHeight != null ? { height: lockedBodyHeight } : undefined}
            onMouseMove={handleListMouseMove}
          >
            <div ref={listViewportRef} css={styles.listViewport}>
              <div ref={listPaneRef} css={styles.listPane}>
                {showNoResults ? (
                  <div css={styles.noResults}>
                    <EuiText size="s" color="subdued" textAlign="center">
                      <FormattedMessage
                        id="xpack.cases.templates.actionsMenu.noResults"
                        defaultMessage="{query} doesn't match any options."
                        values={{ query: searchTerm.trim() }}
                      />
                    </EuiText>
                  </div>
                ) : showEmptyCategory ? (
                  <div css={styles.noResults}>
                    <EuiText size="s" color="subdued" textAlign="center">
                      {isFieldLibraryDrillIn
                        ? i18nStrings.ACTIONS_MENU_NO_LIBRARY_FIELDS
                        : i18n.translate('xpack.cases.templates.actionsMenu.emptyCategory', {
                            defaultMessage: 'No items in this category.',
                          })}
                    </EuiText>
                    {isFieldLibraryDrillIn ? <FieldLibraryOpenLink /> : null}
                  </div>
                ) : (
                  list
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </EuiSelectable>
  );
}

ActionsMenu.displayName = 'ActionsMenu';

function FieldLibraryOpenLink() {
  const { getCasesFieldLibraryUrl } = useCasesFieldLibraryNavigation();

  return (
    <EuiButtonEmpty
      size="xs"
      href={getCasesFieldLibraryUrl()}
      target="_blank"
      iconType="external"
      iconSide="right"
      data-test-subj="actionsMenuPreviewOpenFieldLibrary"
    >
      <FormattedMessage
        id="xpack.cases.templates.actionsMenu.preview.openFieldLibrary"
        defaultMessage="Open Field library"
      />
    </EuiButtonEmpty>
  );
}

FieldLibraryOpenLink.displayName = 'FieldLibraryOpenLink';

const componentStyles = {
  container: css({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  }),
  containerCompact: css({
    minWidth: 0,
  }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      padding: `16px ${euiTheme.size.base} 12px`,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    }),
  titleRow: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  }),
  titleCluster: css({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    minWidth: 0,
  }),
  closeButton: css({
    marginRight: '-4px',
  }),
  title: css({
    margin: 0,
    fontSize: '12.25px',
    lineHeight: '20px',
  }),
  searchRow: css({
    display: 'grid',
    gridTemplateColumns: '0px minmax(0, 1fr)',
    columnGap: 0,
    alignItems: 'center',
    '@media (prefers-reduced-motion: no-preference)': {
      transition: `grid-template-columns ${LIST_SLIDE_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1), column-gap ${LIST_SLIDE_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
    },
  }),
  searchRowWithBack: css({
    gridTemplateColumns: '32px minmax(0, 1fr)',
    columnGap: 4,
  }),
  backSlot: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    minWidth: 0,
    maxWidth: 0,
    opacity: 0,
    transform: 'translateX(-6px)',
    pointerEvents: 'none',
    '@media (prefers-reduced-motion: no-preference)': {
      transition: `max-width ${LIST_SLIDE_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity ${LIST_SLIDE_MS}ms ease, transform ${LIST_SLIDE_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
    },
  }),
  backSlotVisible: css({
    maxWidth: 32,
    opacity: 1,
    transform: 'translateX(0)',
    pointerEvents: 'auto',
  }),
  searchField: css({
    minWidth: 0,
    overflow: 'hidden',
    '& .euiFieldSearch': {
      width: '100%',
    },
  }),
  body: css({
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
  }),
  bodyFull: css({
    maxHeight: 'min(360px, calc(100vh - 200px))',
  }),
  bodyCompact: css({
    maxHeight: 'min(360px, calc(100vh - 220px))',
  }),
  listViewport: css({
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  }),
  listPane: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      willChange: 'transform',
      '& > *': {
        flex: 1,
        minHeight: 0,
      },
    }),
  noResults: css({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '24px',
  }),
  selectable: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      '& .euiSelectableListItem': {
        padding: 0,
        borderRadius: 0,
        borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      },
      '& .euiSelectableListItem:last-child': {
        borderBottom: 'none',
      },
      '& .euiSelectableList': {
        flex: 1,
        height: '100%',
        maxHeight: 'none',
        overflowY: 'auto',
        padding: 0,
      },
      '& .euiSelectableList__list': {
        paddingTop: '0 !important',
        maskImage: 'none',
        WebkitMaskImage: 'none',
        '&::before, &::after': {
          content: 'none !important',
          display: 'none !important',
        },
        '& > ul:has(> .euiSelectableList__groupLabel:first-child)': {
          paddingTop: '16px',
        },
      },
      '& .euiSelectableList__groupLabel': {
        position: 'sticky',
        top: 0,
        zIndex: 2,
        padding: `6px 12px 6px 16px`,
        fontSize: '12.25px',
        fontWeight: euiTheme.font.weight.medium,
        color: euiTheme.colors.textSubdued,
        borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        '&::before': {
          content: 'none',
          display: 'none',
        },
      },
      '& .euiSelectableList__groupLabel ~ .euiSelectableList__groupLabel': {
        marginTop: '24px',
        paddingTop: 0,
      },
      '& .euiSelectableListItem__content': {
        gap: 0,
        borderRadius: 0,
      },
      '& .euiSelectableListItem__text': {
        padding: 0,
        borderRadius: 0,
        textDecoration: 'none !important',
      },
      '& .euiListItemLayout': {
        borderRadius: 0,
      },
      '& .euiSelectableListItem.euiSelectableListItem-isFocused:not(:hover):not(:has(.actionsMenu-keyboardActive)), & .euiSelectableListItem[aria-selected="true"]:not(:hover):not(:has(.actionsMenu-keyboardActive))':
        {
          backgroundColor: `${euiTheme.colors.backgroundBasePlain} !important`,
          color: 'inherit',
        },
      '& .euiSelectableListItem:hover:not([aria-disabled="true"]), & .euiSelectableListItem:has(.actionsMenu-keyboardActive):not([aria-disabled="true"])':
        {
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          color: 'inherit',
        },
      '& .euiSelectableListItem:hover:not([aria-disabled="true"]) .actionsMenu-quickActions, & .euiSelectableListItem:focus-within:not([aria-disabled="true"]) .actionsMenu-quickActions':
        {
          opacity: 1,
          pointerEvents: 'auto',
        },
      '& .euiSelectableListItem[aria-disabled="true"]': {
        cursor: 'not-allowed',
        opacity: 0.55,
      },
    }),
  actionOptionWrapper: css({
    width: '100%',
    padding: `12px 16px`,
  }),
  actionOption: css({
    gap: '11px',
  }),
  actionInfo: css({
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  }),
  iconOuter: css({
    width: '38px',
    height: '38px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    boxSizing: 'border-box',
  }),
  iconOuterNeutral: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  actionIconInner: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
  }),
  arrowContainer: css({
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  }),
  arrow: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textSubdued,
    }),
  quickActions: css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 4,
    flexShrink: 0,
    opacity: 0,
    pointerEvents: 'none',
  }),
  actionTitle: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: 0,
      display: 'block',
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: euiTheme.font.weight.semiBold,
      color: euiTheme.colors.textParagraph,
    }),
  actionDescription: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
};
