/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType, UseEuiTheme } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSelectable,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useCasesFieldLibraryNavigation } from '../../../../common/navigation';
import { CATEGORY_IDS, flattenOptions } from './get_action_options';
import type {
  ActionCategory,
  ActionOptionData,
  ConfigurableFieldAction,
  MenuOptionFields,
  MenuSelectableOption,
} from './types';
import { getOptionAction, isActionCategory, isConfigurableFieldAction } from './types';
import { useDisplayOptions } from './use_display_options';
import * as i18nStrings from '../../translations';

export const ACTIONS_MENU_SEARCH_INPUT_NAME = 'cases-actions-menu-search';
const LIST_SLIDE_MS = 220;
const QUICK_ACTIONS_CLASS = 'actionsMenu-quickActions';

type NavDirection = 'forward' | 'back';

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

/** Id of the listbox EuiSelectable renders for this menu (`${id}_listbox`). */
export const getActionsMenuListboxId = (testSubjPrefix: string): string =>
  `${testSubjPrefix}-selectable_listbox`;

const getOptionsAtPath = (rootOptions: ActionOptionData[], path: string[]): ActionOptionData[] => {
  let options = rootOptions;
  for (const id of path) {
    const option = options.find((item) => item.id === id);
    if (!option || !isActionCategory(option)) {
      return [];
    }
    options = option.options;
  }
  return options;
};

const findCategoryAtPath = (
  rootOptions: ActionOptionData[],
  path: string[]
): ActionCategory | undefined => {
  if (path.length === 0) {
    return undefined;
  }
  const option = getOptionsAtPath(rootOptions, path.slice(0, -1)).find(
    (item) => item.id === path[path.length - 1]
  );
  return option && isActionCategory(option) ? option : undefined;
};

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
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  // Bumped on every drill-in / back so EuiSelectable remounts: its active option is internal
  // state keyed by index, which would otherwise point at an unrelated row of the new level.
  const [navigation, setNavigation] = useState<{ count: number; direction?: NavDirection }>({
    count: 0,
  });
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const activeActionRef = useRef<ActionOptionData | null>(null);
  const wasHiddenRef = useRef(isHidden);
  const [lockedBodyHeight, setLockedBodyHeight] = useState<number | null>(null);

  const flatOptions = useMemo(() => flattenOptions(defaultOptions), [defaultOptions]);
  const options = useMemo(
    () => getOptionsAtPath(defaultOptions, currentPath),
    [defaultOptions, currentPath]
  );

  const focusMenu = useCallback(() => {
    if (isFull) {
      searchInputRef.current?.focus({ preventScroll: true });
      return;
    }
    menuContainerRef.current
      ?.querySelector<HTMLElement>('[role="listbox"]')
      ?.focus({ preventScroll: true });
  }, [isFull]);

  useEffect(() => {
    focusMenu();
  }, [focusMenu, navigation.count]);

  useEffect(() => {
    if (wasHiddenRef.current && !isHidden) {
      // Wait for the configure modal's focus trap to release before reclaiming focus.
      const id = window.requestAnimationFrame(focusMenu);
      wasHiddenRef.current = isHidden;
      return () => window.cancelAnimationFrame(id);
    }
    wasHiddenRef.current = isHidden;
  }, [focusMenu, isHidden]);

  const keepSearchFocused = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(`input[name="${ACTIONS_MENU_SEARCH_INPUT_NAME}"]`)) {
      return;
    }
    e.preventDefault();
  }, []);

  const displayOptions = useDisplayOptions({
    options,
    categoryTree: defaultOptions,
    searchTerm: isFull ? searchTerm : '',
    currentPath,
    testSubjPrefix,
    showSectionLabels: isFull,
  });

  const isSearching = isFull && searchTerm.trim().length > 0;
  const hasActionableItems = displayOptions.some((o) => !o.isGroupLabel);
  const currentCategory = isSearching ? undefined : findCategoryAtPath(defaultOptions, currentPath);
  const childrenStatus = currentCategory?.childrenStatus;
  const showNoResults = isSearching && !hasActionableItems;
  const showEmptyCategory =
    !isSearching && currentPath.length > 0 && options.length === 0 && !childrenStatus;
  const showBack = currentPath.length > 0 && !isSearching;
  const isFieldLibraryDrillIn = currentCategory?.id === CATEGORY_IDS.fieldLibrary;

  useLayoutEffect(() => {
    if (!isFull || currentPath.length > 0 || isSearching || lockedBodyHeight != null) {
      return;
    }
    const height = bodyRef.current?.getBoundingClientRect().height;
    if (height && height > 0) {
      setLockedBodyHeight(height);
    }
  }, [isFull, currentPath.length, isSearching, lockedBodyHeight, displayOptions]);

  const navigateToPath = useCallback((nextPath: string[], direction: NavDirection) => {
    activeActionRef.current = null;
    setCurrentPath(nextPath);
    setNavigation((prev) => ({ count: prev.count + 1, direction }));
  }, []);

  const goBack = useCallback(() => {
    if (currentPath.length === 0) return;
    navigateToPath(currentPath.slice(0, -1), 'back');
  }, [currentPath, navigateToPath]);

  const selectAction = useCallback(
    (action: ActionOptionData, { configure = false }: { configure?: boolean } = {}) => {
      if (action.disabled) return;
      if (isActionCategory(action)) {
        setSearchTerm('');
        navigateToPath([...(action.pathIds ?? [...currentPath, action.id])], 'forward');
        return;
      }
      if (configure && onConfigure && isConfigurableFieldAction(action)) {
        onConfigure(action);
        return;
      }
      onActionSelected(action);
    },
    [currentPath, navigateToPath, onActionSelected, onConfigure]
  );

  const handleSearchChange = (searchValue: string) => {
    setSearchTerm(searchValue);
    // Search spans the whole catalog, so drop the drill-in; clearing returns to the root.
    if (searchValue.length > 0 && currentPath.length > 0) {
      setCurrentPath([]);
    }
  };

  // EuiSelectable owns ArrowUp/ArrowDown/Enter (and aria-activedescendant). Only the
  // hierarchy keys live here; they stop propagation so EuiSelectable doesn't reset its
  // active option on keys it doesn't handle.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isHidden || e.metaKey || e.ctrlKey || e.altKey) return;
    const stop = () => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (e.key === 'Escape') {
      stop();
      if (currentPath.length > 0) {
        goBack();
      } else {
        onClose?.();
      }
      return;
    }
    if (e.key === 'ArrowLeft' && currentPath.length > 0) {
      stop();
      goBack();
      return;
    }
    if (e.key === 'ArrowRight') {
      const active = activeActionRef.current;
      if (active && isActionCategory(active) && !active.disabled) {
        stop();
        selectAction(active);
      }
      return;
    }

    const input = searchInputRef.current;
    if (isFull && input && e.target !== input && e.key.length === 1 && e.key !== ' ') {
      stop();
      handleSearchChange(`${searchTerm}${e.key}`);
      input.focus({ preventScroll: true });
    }
  };

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

  const renderActionOption = (rawOption: MenuSelectableOption, searchValue: string) => {
    const action = getOptionAction(rawOption);
    const effectiveSearch = (searchTerm || searchValue).trim();

    if (!action) {
      return (
        <div css={styles.actionOptionWrapper}>
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
      <div css={styles.actionOptionWrapper} data-option-id={action.id}>
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
              {/* Pointer shortcuts only: an option can't contain interactive content, so these
                  stay out of the tab order and the a11y tree. Enter / Shift+Enter on the row
                  cover the same actions from the keyboard. */}
              <div className={QUICK_ACTIONS_CLASS} css={styles.quickActions} aria-hidden>
                <EuiToolTip
                  content={i18nStrings.ACTIONS_MENU_CONFIGURE_AND_ADD}
                  disableScreenReaderOutput
                >
                  {/* eslint-disable-next-line @elastic/eui/accessible-interactive-element -- pointer-only duplicate of Shift+Enter on the row; a tab stop inside role="option" is invalid */}
                  <EuiButtonIcon
                    color="text"
                    iconType="controls"
                    size="s"
                    tabIndex={-1}
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
                  {/* eslint-disable-next-line @elastic/eui/accessible-interactive-element -- pointer-only duplicate of Enter on the row */}
                  <EuiButtonIcon
                    color="text"
                    display="base"
                    iconType="plusCircle"
                    size="s"
                    tabIndex={-1}
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

  const searchableProps = isFull
    ? {
        searchable: true as const,
        searchProps: {
          id: `${testSubjPrefix}-search`,
          name: ACTIONS_MENU_SEARCH_INPUT_NAME,
          placeholder: i18nStrings.ACTIONS_MENU_SEARCH_PLACEHOLDER,
          value: searchTerm,
          onChange: handleSearchChange,
          compressed: true,
          isClearable: true,
          'data-test-subj': `${testSubjPrefix}-search`,
          inputRef: (node: HTMLInputElement | null) => {
            searchInputRef.current = node;
          },
        },
      }
    : { searchable: false as const };

  const listPaneAnimation =
    navigation.direction === 'forward'
      ? styles.listPaneForward
      : navigation.direction === 'back'
      ? styles.listPaneBack
      : undefined;

  return (
    <EuiSelectable<MenuOptionFields>
      key={navigation.count}
      id={`${testSubjPrefix}-selectable`}
      aria-label={headerTitle}
      {...searchableProps}
      options={displayOptions}
      onChange={(_options, event, selectedOption) => {
        const action = getOptionAction(selectedOption);
        if (action) {
          selectAction(action, { configure: event.shiftKey });
        }
      }}
      onActiveOptionChange={(option) => {
        activeActionRef.current = option ? getOptionAction(option) ?? null : null;
      }}
      isPreFiltered
      selectableScreenReaderText={onConfigure ? i18nStrings.ACTIONS_MENU_KEYBOARD_HINT : undefined}
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
          onKeyDown={handleKeyDown}
          data-test-subj={`${testSubjPrefix}Content`}
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
          >
            <div css={[styles.listPane, listPaneAnimation]}>
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
              ) : childrenStatus === 'loading' ? (
                <div css={styles.noResults} data-test-subj={`${testSubjPrefix}-childrenLoading`}>
                  <EuiLoadingSpinner size="m" />
                  <EuiText size="s" color="subdued" aria-live="polite">
                    {i18nStrings.ACTIONS_MENU_LOADING_LIBRARY}
                  </EuiText>
                </div>
              ) : childrenStatus === 'error' ? (
                <div css={styles.noResults} data-test-subj={`${testSubjPrefix}-childrenError`}>
                  <EuiIcon type="warning" color="danger" aria-hidden />
                  <EuiText size="s" color="danger" role="alert">
                    {i18nStrings.ACTIONS_MENU_LIBRARY_ERROR}
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

const slideFromRight = keyframes({
  from: { transform: 'translateX(24px)', opacity: 0 },
  to: { transform: 'translateX(0)', opacity: 1 },
});

const slideFromLeft = keyframes({
  from: { transform: 'translateX(-24px)', opacity: 0 },
  to: { transform: 'translateX(0)', opacity: 1 },
});

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
  listPane: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      minHeight: 0,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      '& > *': {
        flex: 1,
        minHeight: 0,
      },
    }),
  listPaneForward: css({
    '@media (prefers-reduced-motion: no-preference)': {
      animation: `${slideFromRight} ${LIST_SLIDE_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
    },
  }),
  listPaneBack: css({
    '@media (prefers-reduced-motion: no-preference)': {
      animation: `${slideFromLeft} ${LIST_SLIDE_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
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
  selectable: (euiThemeContext: UseEuiTheme) => {
    const { euiTheme } = euiThemeContext;
    return css({
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
        padding: `${euiTheme.size.xs} ${euiTheme.size.m} ${euiTheme.size.xs} ${euiTheme.size.base}`,
        fontSize: euiFontSize(euiThemeContext, 'xs').fontSize,
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
      '& .euiSelectableListItem:hover:not([aria-disabled="true"])': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        color: 'inherit',
      },
      [`& .euiSelectableListItem:hover:not([aria-disabled="true"]) .${QUICK_ACTIONS_CLASS}, & .euiSelectableListItem-isFocused:not([aria-disabled="true"]) .${QUICK_ACTIONS_CLASS}`]:
        {
          opacity: 1,
          pointerEvents: 'auto',
        },
      '& .euiSelectableListItem[aria-disabled="true"]': {
        cursor: 'not-allowed',
        opacity: 0.55,
      },
    });
  },
  actionOptionWrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
    }),
  actionOption: ({ euiTheme }: UseEuiTheme) =>
    css({
      gap: euiTheme.size.m,
    }),
  actionInfo: css({
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  }),
  iconOuter: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: euiTheme.size.xxl,
      height: euiTheme.size.xxl,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: euiTheme.border.radius.medium,
      boxSizing: 'border-box',
    }),
  iconOuterNeutral: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  actionIconInner: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: euiTheme.size.base,
      height: euiTheme.size.base,
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
  actionTitle: (euiThemeContext: UseEuiTheme) =>
    css({
      margin: 0,
      display: 'block',
      ...euiFontSize(euiThemeContext, 's'),
      fontWeight: euiThemeContext.euiTheme.font.weight.semiBold,
      color: euiThemeContext.euiTheme.colors.textParagraph,
    }),
  actionDescription: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
};
