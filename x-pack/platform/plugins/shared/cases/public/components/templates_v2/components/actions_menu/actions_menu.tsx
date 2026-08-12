/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBreadcrumb, EuiSelectableOption, UseEuiTheme } from '@elastic/eui';
import {
  EuiBadge,
  EuiBreadcrumbs,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiSelectable,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ActionsMenuPreviewPanel } from './actions_menu_preview_panel';
import { flattenOptions } from './get_action_options';
import type { ActionOptionData, ConfigurableFieldAction, IconVariant } from './types';
import { getOptionAction, isActionCategory } from './types';
import { useDisplayOptions } from './use_display_options';
import * as i18nStrings from '../../translations';

const SEARCH_INPUT_NAME = 'cases-actions-menu-search';
const LIST_SLIDE_MS = 220;
const KEYBOARD_ACTIVE_CLASS = 'actionsMenu-keyboardActive';

type PendingListFocus = 'first' | 'none' | { optionId: string };

export interface ActionsMenuProps {
  options: ActionOptionData[];
  testSubjPrefix: string;
  onActionSelected: (action: ActionOptionData) => void;
  onConfigureAndAdd?: (action: ConfigurableFieldAction) => void;
  onClose?: () => void;
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

function getIconOuterStyle(
  variant: IconVariant | undefined,
  styles: ReturnType<typeof useMemoCss<typeof componentStyles>>
) {
  switch (variant) {
    case 'library':
      return styles.iconOuterLibrary;
    case 'validation':
      return styles.iconOuterValidation;
    case 'conditional':
      return styles.iconOuterConditional;
    case 'platform':
    default:
      return styles.iconOuterPlatform;
  }
}

export function ActionsMenu({
  options: defaultOptions,
  testSubjPrefix,
  onActionSelected,
  onConfigureAndAdd,
  onClose,
}: ActionsMenuProps) {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const listViewportRef = useRef<HTMLDivElement | null>(null);
  const listPaneRef = useRef<HTMLDivElement | null>(null);
  const isSlidingRef = useRef(false);
  const pendingListFocusRef = useRef<PendingListFocus | null>(null);
  const keyboardIndexRef = useRef<number | null>(null);

  const flatOptions = useMemo(() => flattenOptions(defaultOptions), [defaultOptions]);

  const [options, setOptions] = useState<ActionOptionData[]>(defaultOptions);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [hoveredOption, setHoveredOption] = useState<ActionOptionData | null>(null);
  const [pinnedOption, setPinnedOption] = useState<ActionOptionData | null>(null);
  const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);
  keyboardIndexRef.current = keyboardIndex;

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  const clearKeyboardSelection = useCallback(() => {
    setKeyboardIndex(null);
    setHoveredOption(null);
  }, []);

  useEffect(() => {
    focusSearch();
  }, [focusSearch]);

  const keepSearchFocused = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(`input[name="${SEARCH_INPUT_NAME}"]`)) {
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
    searchTerm,
    currentPath,
    testSubjPrefix,
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
    if (index == null) return;
    const option = actionableDisplayOptionsRef.current[index];
    const action = option ? getOptionAction(option) : undefined;
    if (action) {
      setHoveredOption(action);
    }
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

  const isSearching = searchTerm.trim().length > 0;
  const hasActionableItems = displayOptions.some((o) => !o.isGroupLabel);
  const showNoResults = isSearching && !hasActionableItems;
  const previewOption = hoveredOption ?? pinnedOption;

  const handleListMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (keyboardIndexRef.current != null) {
        setKeyboardIndex(null);
      }
      const optionTarget = (e.target as HTMLElement).closest('[data-option-id]');
      if (!optionTarget) return;
      const optionId = optionTarget.getAttribute('data-option-id');
      if (!optionId) return;
      const found = flatOptions.find((o) => o.id === optionId);
      if (found && found.id !== hoveredOption?.id) {
        setHoveredOption(found);
      }
    },
    [flatOptions, hoveredOption]
  );

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
        setPinnedOption(null);
        setHoveredOption(null);
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

  const handleStepOrGroupSelected = useCallback(
    (action: ActionOptionData) => {
      if (action.disabled) return;
      if (isActionCategory(action)) {
        const nextPath = action.pathIds ?? [...currentPath, action.id];
        setSearchTerm('');
        navigateToPath([...nextPath], 'none');
      } else {
        setPinnedOption(null);
        onActionSelected(action);
      }
    },
    [currentPath, navigateToPath, onActionSelected]
  );

  const handleAdd = useCallback(
    (action: ActionOptionData) => {
      if (action.disabled || isActionCategory(action)) return;
      setPinnedOption(null);
      onActionSelected(action);
    },
    [onActionSelected]
  );

  const handlePinPreview = useCallback((action: ActionOptionData, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPinnedOption(action);
    setHoveredOption(action);
  }, []);

  const handleAddFromRow = useCallback(
    (action: ActionOptionData, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleAdd(action);
    },
    [handleAdd]
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
    const showRootIcon = isCategory && currentPath.length === 0 && !isSearching && action.iconType;
    const hideInfo = action.kind === 'fieldType';

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
          {showRootIcon ? (
            <EuiFlexItem
              grow={false}
              css={[styles.iconOuter, getIconOuterStyle(action.iconVariant, styles)]}
            >
              <span css={styles.actionIconInner}>
                <EuiIcon
                  type={action.iconType!}
                  size="m"
                  color={euiTheme.colors.textInverse}
                  aria-hidden
                />
              </span>
            </EuiFlexItem>
          ) : null}
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
          {isCategory ? (
            <EuiFlexItem grow={false} css={styles.arrowContainer}>
              <EuiIcon type="arrowRight" size="s" css={styles.arrow} aria-hidden />
            </EuiFlexItem>
          ) : (
            <span className="rowActions" css={styles.rowActions}>
              {!hideInfo && (
                <EuiButtonIcon
                  iconType="info"
                  size="m"
                  iconSize="m"
                  color="text"
                  display="empty"
                  css={styles.rowActionButton}
                  aria-label={i18n.translate('xpack.cases.templates.actionsMenu.viewDetails', {
                    defaultMessage: 'View details',
                  })}
                  data-test-subj="actionsMenuItemInfo"
                  onClick={(e: React.MouseEvent) => handlePinPreview(action, e)}
                  onMouseDown={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
              )}
              {!action.disabled && (
                <EuiButtonIcon
                  iconType="plusInCircle"
                  size="m"
                  iconSize="m"
                  color="text"
                  display="empty"
                  css={styles.rowActionButton}
                  aria-label={i18n.translate('xpack.cases.templates.actionsMenu.addItem', {
                    defaultMessage: 'Add',
                  })}
                  data-test-subj="actionsMenuItemAdd"
                  onClick={(e: React.MouseEvent) => handleAddFromRow(action, e)}
                  onMouseDown={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
              )}
            </span>
          )}
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

  const leaveCategoryFromKeyboard = useCallback(() => {
    const path = currentPathRef.current;
    if (path.length === 0) return;
    const exitedId = path[path.length - 1];
    navigateToPath(path.slice(0, -1), { optionId: exitedId });
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
    setPinnedOption(null);
    setHoveredOption(null);
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const input = searchInputRef.current;
      if (!input || !document.body.contains(input)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const menuEl = menuContainerRef.current;
      if (menuEl && !menuEl.contains(document.activeElement) && document.activeElement !== input) {
        if (!menuEl.contains(e.target as Node)) return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        return;
      }

      const actionable = actionableDisplayOptionsRef.current;
      const isSearchFocused = document.activeElement === input;
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
        if (!inListNavMode) return;
        e.preventDefault();
        e.stopPropagation();
        leaveCategoryFromKeyboard();
        return;
      }

      if (e.key === 'Enter' && inListNavMode) {
        e.preventDefault();
        e.stopPropagation();
        activateKeyboardOption();
        return;
      }

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
    leaveCategoryFromKeyboard,
    onClose,
  ]);

  const pathLabels = useMemo(
    () => resolvePathLabels(currentPath, defaultOptions),
    [currentPath, defaultOptions]
  );

  const breadcrumbs: EuiBreadcrumb[] = useMemo(() => {
    const allActionsLabel = i18nStrings.ACTIONS_MENU_BREADCRUMB_ALL;

    if (isSearching) {
      return [
        {
          text: allActionsLabel,
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            setSearchTerm('');
            navigateToPath([]);
          },
        },
        { text: i18nStrings.ACTIONS_MENU_BREADCRUMB_SEARCH },
      ];
    }

    if (currentPath.length === 0) return [];

    const crumbs: EuiBreadcrumb[] = [
      {
        text: allActionsLabel,
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          navigateToPath([]);
        },
      },
    ];

    pathLabels.forEach((item, index) => {
      const isLast = index === pathLabels.length - 1;
      const pathToHere = currentPath.slice(0, index + 1);
      crumbs.push({
        text: item.label,
        ...(isLast
          ? {}
          : {
              onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                navigateToPath(pathToHere);
              },
            }),
      });
    });

    return crumbs;
  }, [isSearching, currentPath, pathLabels, navigateToPath]);

  const showBreadcrumbs = breadcrumbs.length > 0;

  return (
    <EuiSelectable
      aria-label={i18nStrings.ACTIONS_MENU_ROOT_TITLE}
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
          const next = e.relatedTarget as Node | null;
          const menuEl = menuContainerRef.current;
          if (menuEl && next && menuEl.contains(next)) {
            return;
          }
          requestAnimationFrame(() => {
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
          css={styles.container}
          onMouseDown={keepSearchFocused}
          data-test-subj={`${testSubjPrefix}Content`}
        >
          <div css={styles.header}>
            <div css={styles.titleRow}>
              <EuiTitle size="xxs">
                <h3 css={styles.title}>{i18nStrings.ACTIONS_MENU_ROOT_TITLE}</h3>
              </EuiTitle>
              {onClose && (
                <EuiButtonEmpty
                  onClick={onClose}
                  iconType="cross"
                  size="xs"
                  flush="right"
                  color="text"
                  aria-label={i18n.translate('xpack.cases.templates.actionsMenu.close', {
                    defaultMessage: 'Close actions menu',
                  })}
                  css={styles.closeButton}
                  data-test-subj={`${testSubjPrefix}-close`}
                />
              )}
            </div>
            <div css={styles.searchRow}>{search}</div>
          </div>

          <EuiFlexGroup gutterSize="none" css={styles.body}>
            <EuiFlexItem css={styles.leftColumn} onMouseMove={handleListMouseMove}>
              {showBreadcrumbs && (
                <div css={styles.breadcrumbRow}>
                  <EuiBreadcrumbs
                    breadcrumbs={breadcrumbs}
                    truncate={false}
                    max={4}
                    aria-label={i18nStrings.ACTIONS_MENU_BREADCRUMB_ARIA}
                  />
                </div>
              )}
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
              ) : (
                <div ref={listViewportRef} css={styles.listViewport}>
                  <div ref={listPaneRef} css={styles.listPane}>
                    {list}
                  </div>
                </div>
              )}
            </EuiFlexItem>

            <EuiFlexItem css={styles.rightColumn}>
              <ActionsMenuPreviewPanel
                hoveredOption={previewOption}
                onSelect={handleStepOrGroupSelected}
                onAdd={handleAdd}
                onConfigureAndAdd={onConfigureAndAdd}
                onPinPreview={(action, parentSection) => {
                  if (parentSection && isActionCategory(parentSection)) {
                    const nextPath = parentSection.pathIds ?? [...currentPath, parentSection.id];
                    const alreadyThere =
                      nextPath.length === currentPath.length &&
                      nextPath.every((id, i) => id === currentPath[i]);
                    if (!alreadyThere) {
                      setSearchTerm('');
                      navigateToPath([...nextPath]);
                    }
                  }
                  setPinnedOption(action);
                  setHoveredOption(action);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      )}
    </EuiSelectable>
  );
}

const componentStyles = {
  container: css({
    display: 'flex',
    flexDirection: 'column',
    width: '1085px',
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
    '& .euiFieldSearch': {
      width: '100%',
    },
  }),
  body: css({
    height: '640px',
    overflow: 'hidden',
  }),
  leftColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '0 0 50%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
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
  breadcrumbRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      marginTop: -1,
      padding: `8px 16px`,
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      position: 'relative',
      zIndex: 1,
      fontSize: '12px',
      '& .euiBreadcrumb, & .euiBreadcrumb__content, & .euiBreadcrumbs__list': {
        fontSize: '12px',
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
  rightColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      overflow: 'hidden',
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
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
        fontWeight: 700,
        color: euiTheme.colors.textParagraph,
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
      '& .euiSelectableListItem:hover, & .euiSelectableListItem:has(.actionsMenu-keyboardActive)': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        color: 'inherit',
      },
      '& .euiSelectableListItem .rowActions': {
        opacity: 0,
        pointerEvents: 'none',
      },
      '& .euiSelectableListItem:hover .rowActions, & .euiSelectableListItem:has(.actionsMenu-keyboardActive) .rowActions':
        {
          opacity: 1,
          pointerEvents: 'auto',
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
    width: '40px',
    height: '40px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    boxSizing: 'border-box',
  }),
  iconOuterPlatform: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis2,
      border: 'none',
    }),
  iconOuterLibrary: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis4,
      border: 'none',
    }),
  iconOuterValidation: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis0,
      border: 'none',
    }),
  iconOuterConditional: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.vis.euiColorVis8,
      border: 'none',
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
  rowActions: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '4px',
  }),
  rowActionButton: css({
    inlineSize: '32px',
    blockSize: '32px',
    width: '32px',
    height: '32px',
  }),
  actionTitle: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: 0,
      display: 'block',
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: euiTheme.font.weight.medium,
      color: euiTheme.colors.textParagraph,
    }),
  actionDescription: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
};
