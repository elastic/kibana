/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableTemplateSitewideOption } from '@elastic/eui';
import {
  EuiButton,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiHeaderSectionItemButton,
  EuiI18n,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiSelectable,
  EuiText,
  EuiLoadingSpinner,
  EuiSelectableTemplateSitewide,
  euiSelectableTemplateSitewideRenderOptions,
  useEuiMemoizedStyles,
  useEuiTheme,
  useEuiBreakpoint,
  mathWithUnits,
  useEuiMinBreakpoint,
} from '@elastic/eui';
import { euiSelectableTemplateSitewideFormatOptions } from '@elastic/eui/lib/components/selectable/selectable_templates';
import { euiSelectableTemplateSitewideStyles } from '@elastic/eui/lib/components/selectable/selectable_templates/selectable_template_sitewide.styles';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/lib/components/selectable/selectable';
import { css, Global } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { GlobalSearchFindParams, GlobalSearchResult } from '@kbn/global-search-plugin/public';
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apm } from '@elastic/apm-rum';
import useDebounce from 'react-use/lib/useDebounce';
import useEvent from 'react-use/lib/useEvent';
import useMountedState from 'react-use/lib/useMountedState';
import useObservable from 'react-use/lib/useObservable';
import type { Subscription } from 'rxjs';
import { isMac } from '@kbn/shared-ux-utility';
import { blurEvent, sort } from '.';
import { resultToOption, suggestionToOption } from '../lib';
import { parseSearchParams } from '../search_syntax';
import { i18nStrings } from '../strings';
import type { SearchSuggestion } from '../suggestions';
import { getSuggestions } from '../suggestions';
import { PopoverFooter } from './popover_footer';
import { PopoverPlaceholder } from './popover_placeholder';
import type { SearchBarProps } from './types';

const SearchCharLimitExceededMessage = (props: { basePathUrl: string }) => {
  const charLimitMessage = (
    <>
      <EuiText size="m">
        <p data-test-subj="searchCharLimitExceededMessageHeading">
          <FormattedMessage
            id="xpack.globalSearchBar.searchBar.searchCharLimitExceededHeading"
            defaultMessage="Search character limit exceeded"
          />
        </p>
      </EuiText>
      <p>
        <FormattedMessage
          id="xpack.globalSearchBar.searchBar.searchCharLimitExceeded"
          defaultMessage="Try searching for applications, dashboards, visualizations, and more."
        />
      </p>
    </>
  );

  return (
    <PopoverPlaceholder basePath={props.basePathUrl} customPlaceholderMessage={charLimitMessage} />
  );
};

const EmptyMessage = () => (
  <EuiFlexGroup
    direction="column"
    justifyContent="center"
    css={css`
      min-height: 300px;
    `}
  >
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="xl" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const SearchBar: FC<SearchBarProps> = (opts) => {
  const { globalSearch, taggingApi, navigateToUrl, reportEvent, chromeStyle$, ...props } = opts;

  const isMounted = useMountedState();
  const { euiTheme } = useEuiTheme();
  const chromeStyle = useObservable(chromeStyle$);

  // These hooks are used when on chromeStyle set to 'project'
  const [isVisible, setIsVisible] = useState(false);
  const visibilityButtonRef = useRef<HTMLButtonElement | null>(null);

  // General hooks
  const [initialLoad, setInitialLoad] = useState(false);
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);
  const [buttonRef, setButtonRef] = useState<HTMLDivElement | null>(null);
  const searchSubscription = useRef<Subscription | null>(null);
  const [options, setOptions] = useState<EuiSelectableTemplateSitewideOption[]>([]);
  const [searchableTypes, setSearchableTypes] = useState<string[]>([]);
  const [showAppend, setShowAppend] = useState<boolean>(true);
  const UNKNOWN_TAG_ID = '__unknown__';
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchCharLimitExceeded, setSearchCharLimitExceeded] = useState(false);

  const styles = css({
    [useEuiBreakpoint(['m', 'l'])]: {
      width: mathWithUnits(euiTheme.size.xxl, (x) => x * 10),
    },
    [useEuiMinBreakpoint('xl')]: {
      width: mathWithUnits(euiTheme.size.xxl, (x) => x * 15),
    },
  });

  const sitewideTemplateStyles = useEuiMemoizedStyles(euiSelectableTemplateSitewideStyles);
  const formattedOptions = useMemo(
    () => euiSelectableTemplateSitewideFormatOptions(options, sitewideTemplateStyles),
    [options, sitewideTemplateStyles]
  );

  // Initialize searchableTypes data
  useEffect(() => {
    if (initialLoad) {
      const fetch = async () => {
        const types = await globalSearch.getSearchableTypes();
        setSearchableTypes(types);
      };
      fetch();
    }
  }, [globalSearch, initialLoad]);

  // Whenever searchValue changes, isLoading = true
  useEffect(() => {
    setIsLoading(true);
  }, [searchValue]);

  const loadSuggestions = useCallback(
    (term: string) => {
      return getSuggestions({
        searchTerm: term,
        searchableTypes,
        tagCache: taggingApi?.cache,
      });
    },
    [taggingApi, searchableTypes]
  );

  const setDecoratedOptions = useCallback(
    (
      _options: GlobalSearchResult[],
      suggestions: SearchSuggestion[],
      searchTagIds: string[] = []
    ) => {
      setOptions([
        ...suggestions.map(suggestionToOption),
        ..._options.map((option) =>
          resultToOption(
            option,
            searchTagIds?.filter((id) => id !== UNKNOWN_TAG_ID) ?? [],
            taggingApi?.ui.getTagList
          )
        ),
      ]);
    },
    [setOptions, taggingApi]
  );

  useDebounce(
    () => {
      if (initialLoad) {
        // cancel pending search if not completed yet
        if (searchSubscription.current) {
          searchSubscription.current.unsubscribe();
          searchSubscription.current = null;
        }

        if (searchValue.length > globalSearch.searchCharLimit) {
          // setting this will display an error message to the user
          setSearchCharLimitExceeded(true);
          return;
        } else {
          setSearchCharLimitExceeded(false);
        }

        const suggestions = loadSuggestions(searchValue.toLowerCase());

        let aggregatedResults: GlobalSearchResult[] = [];

        if (searchValue.length !== 0) {
          reportEvent.searchRequest();
        }

        const rawParams = parseSearchParams(searchValue.toLowerCase(), searchableTypes);
        let tagIds: string[] | undefined;
        if (taggingApi && rawParams.filters.tags) {
          tagIds = rawParams.filters.tags.map(
            (tagName) => taggingApi.ui.getTagIdFromName(tagName) ?? UNKNOWN_TAG_ID
          );
        } else {
          tagIds = undefined;
        }
        const searchParams: GlobalSearchFindParams = {
          term: rawParams.term,
          types: rawParams.filters.types,
          tags: tagIds,
        };

        searchSubscription.current = globalSearch.find(searchParams, {}).subscribe({
          next: ({ results }) => {
            if (!isMounted()) {
              return;
            }

            if (searchValue.length > 0) {
              aggregatedResults = [...results, ...aggregatedResults].sort(sort.byScore);
              setDecoratedOptions(aggregatedResults, suggestions, searchParams.tags);
              return;
            }

            // if searchbar is empty, filter to only applications and sort alphabetically
            results = results.filter(({ type }: GlobalSearchResult) => type === 'application');
            aggregatedResults = [...results, ...aggregatedResults].sort(sort.byTitle);
            setDecoratedOptions(aggregatedResults, suggestions, searchParams.tags);
          },
          error: (err) => {
            setIsLoading(false);

            // Not doing anything on error right now because it'll either just show the previous
            // results or empty results which is basically what we want anyways
            apm.captureError(err, {
              labels: {
                SearchValue: searchValue,
              },
            });
          },
          complete: () => {
            setIsLoading(false);
          },
        });
      }
    },
    350,
    [searchValue, loadSuggestions, searchableTypes, initialLoad]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === '/' && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        reportEvent.shortcutUsed();
        if (chromeStyle === 'project' && !isVisible) {
          visibilityButtonRef.current?.click();
        } else if (searchRef) {
          searchRef.focus();
        } else if (buttonRef) {
          (buttonRef.children[0] as HTMLButtonElement).click();
        }
      }
    },
    [chromeStyle, isVisible, buttonRef, searchRef, reportEvent]
  );

  const onChange = useCallback(
    (selection: EuiSelectableTemplateSitewideOption[], event: EuiSelectableOnChangeEvent) => {
      let selectedRank: number | null = null;
      const selected = selection.find(({ checked }, rank) => {
        const isChecked = checked === 'on';
        if (isChecked) {
          selectedRank = rank + 1;
        }
        return isChecked;
      });

      if (!selected) {
        return;
      }

      const selectedLabel = selected.label ?? null;

      // @ts-ignore - ts error is "union type is too complex to express"
      const { url, type, suggestion } = selected;

      // if the type is a suggestion, we change the query on the input and trigger a new search
      // by setting the searchValue (only setting the field value does not trigger a search)
      if (type === '__suggestion__') {
        setSearchValue(suggestion);
        return;
      }

      // errors in tracking should not prevent selection behavior
      try {
        if (type === 'application') {
          const key = selected.key ?? 'unknown';
          const application = `${key.toLowerCase().replaceAll(' ', '_')}`;
          reportEvent.navigateToApplication({
            application,
            searchValue,
            selectedLabel,
            selectedRank,
          });
        } else {
          reportEvent.navigateToSavedObject({
            type,
            searchValue,
            selectedLabel,
            selectedRank,
          });
        }
      } catch (err) {
        apm.captureError(err, {
          labels: {
            SearchValue: searchValue,
          },
        });
        // eslint-disable-next-line no-console
        console.log('Error trying to track searchbar metrics', err);
      }

      if (event.shiftKey) {
        window.open(url);
      } else if (event.ctrlKey || event.metaKey) {
        window.open(url, '_blank');
      } else {
        navigateToUrl(url);
      }

      setIsVisible(false);

      (document.activeElement as HTMLElement).blur();
      if (searchRef) {
        clearField();
        searchRef.dispatchEvent(blurEvent);
      }
    },
    [reportEvent, navigateToUrl, searchRef, searchValue]
  );

  const clearField = () => setSearchValue('');

  const keyboardShortcutTooltip = `${i18nStrings.keyboardShortcutTooltip.prefix}: ${
    isMac ? i18nStrings.keyboardShortcutTooltip.onMac : i18nStrings.keyboardShortcutTooltip.onNotMac
  }`;

  const projectSearchRevealAriaLabel = useMemo(
    () =>
      i18n.translate('xpack.globalSearchBar.searchBar.showSearchWithShortcutAriaLabel', {
        defaultMessage: 'Show search bar, keyboard shortcut {shortcut}',
        values: {
          shortcut: isMac
            ? i18nStrings.keyboardShortcutTooltip.onMac
            : i18nStrings.keyboardShortcutTooltip.onNotMac,
        },
      }),
    [isMac]
  );

  useEvent('keydown', onKeyDown);

  const closePalette = useCallback(() => {
    reportEvent.searchBlur();
    setIsVisible(false);
  }, [reportEvent]);

  /** Match EUI form control chrome: default border, hover darkens border only (no fill shift). */
  const projectChromeSearchRevealButtonCss = useMemo(
    () => css`
      &&& {
        box-sizing: border-box;
        inline-size: 280px !important;
        min-inline-size: 280px !important;
        max-inline-size: 280px !important;
        background-color: transparent !important;
        color: ${euiTheme.colors.textSubdued} !important;
        font-weight: ${euiTheme.font.weight.regular} !important;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.components.forms.border} !important;
        /* Figma: frame radius = space xs → 4px */
        border-radius: 4px !important;
        box-shadow: none !important;
        text-align: start !important;
        /* Figma: 8px horizontal, 6px vertical padding; end inset −2px so shortcut sits closer to the frame edge */
        padding-block: 6px !important;
        padding-inline-start: ${euiTheme.size.s} !important;
        padding-inline-end: ${mathWithUnits(euiTheme.size.s, (x) => x - 2)} !important;
      }

      /* Figma: 6px gap between icon, label, and shortcut (matches --spaces/6) */
      &&& [class*='euiButtonDisplayContent'] {
        justify-content: flex-start !important;
        inline-size: 100% !important;
        gap: 6px;
      }

      &&& .kbnSearchBarProjectRevealLabel {
        flex: 1 1 0%;
        min-inline-size: 0;
        text-align: start;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* EuiButton base+text uses an overlay ::before for hover/active; remove so background never changes */
      &&&:hover::before,
      &&&:hover:enabled::before,
      &&&:active::before,
      &&&:active:enabled::before {
        display: none !important;
      }

      &&&:hover,
      &&&:hover:enabled {
        background-color: transparent !important;
        border-color: ${euiTheme.components.forms.borderHovered} !important;
        box-shadow: none !important;
      }

      &&&:active,
      &&&:active:enabled {
        background-color: transparent !important;
        border-color: ${euiTheme.components.forms.borderHovered} !important;
        box-shadow: none !important;
      }

      &&&:focus-visible {
        outline: none !important;
        border-color: ${euiTheme.components.forms.borderFocused} !important;
        box-shadow: none !important;
      }

      /* Shortcut span: no overflow:hidden — it would clip descendants; max-width/opacity animate here */
      &&& .kbnSearchBarProjectRevealShortcut {
        flex-shrink: 0;
        min-inline-size: 0;
        max-width: 0;
        opacity: 0;
        margin-inline-start: 0;
      }

      @media (hover: hover) and (pointer: fine) {
        &&&:hover .kbnSearchBarProjectRevealShortcut,
        &&&:focus-visible .kbnSearchBarProjectRevealShortcut {
          max-width: 10rem;
          opacity: 1;
          margin-inline-start: 2px;
        }
      }

      @media (hover: none), (pointer: coarse) {
        &&& .kbnSearchBarProjectRevealShortcut {
          max-width: 10rem;
          opacity: 1;
          margin-inline-start: 2px;
        }
      }
    `,
    [euiTheme]
  );

  const projectRevealShortcutSurfaceCss = useMemo(
    () => css`
      && {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        min-inline-size: 0;
        block-size: 20px;
        max-block-size: 20px;
        overflow: visible;
        white-space: nowrap;
        vertical-align: bottom;
        background-color: ${euiTheme.colors.backgroundLightText};
        border: none;
        border-radius: 2px;
        padding-inline: 6px;
        padding-block: 0;
        transition:
          max-width 150ms ease,
          opacity 150ms ease,
          margin-inline-start 150ms ease;
      }
    `,
    [euiTheme]
  );

  const projectRevealShortcutCodeCss = useMemo(
    () => css`
      &&& {
        background-color: transparent !important;
        box-shadow: none !important;
        color: ${euiTheme.colors.subduedText} !important;
        font-weight: ${euiTheme.font.weight.regular} !important;
        border-radius: 0 !important;
        border: none !important;
        padding-block: 0 !important;
        padding-inline: 0 !important;
        max-inline-size: 100%;
        min-inline-size: 0;
        overflow: hidden;
      }
    `,
    [euiTheme]
  );

  const getAppendForChromeStyle = () => {
    if (chromeStyle === 'project') {
      // Project search is a modal; close icon is hidden—in-field append / Escape / overlay close instead.
      return undefined;
    }

    if (showAppend) {
      return (
        <EuiFormLabel
          title={keyboardShortcutTooltip}
          css={{ fontFamily: euiTheme.font.familyCode }}
        >
          {isMac ? '⌘/' : '^/'}
        </EuiFormLabel>
      );
    }
  };

  const projectSearchCommandPaletteGlobalCss = useMemo(
    () => css`
      /* EuiModal always renders a close icon; hide it for the command palette (Escape / overlay still close). */
      .kbnGlobalSearchBarProjectModal .euiModal__closeIcon {
        display: none !important;
      }
      /* Outer body: no padding; scroll area gets uniform inset (EUI defaults pad .euiModalBody__overflow only). */
      .kbnGlobalSearchBarProjectModal .euiModalBody {
        padding: 0 !important;
      }
      .kbnGlobalSearchBarProjectModal .euiModalBody__overflow {
        padding: ${euiTheme.size.base} !important;
      }
      /* Footer: pinned to modal bottom with top rule; full-width help row + pill shortcuts */
      .kbnGlobalSearchBarProjectModal .euiModalFooter {
        border-top: ${euiTheme.border.thin} !important;
        background-color: ${euiTheme.colors.emptyShade} !important;
        flex-shrink: 0 !important;
        justify-content: stretch !important;
        gap: 0 !important;
        padding-block: ${euiTheme.size.s} !important;
        padding-inline: ${euiTheme.size.base} !important;
      }
      .kbnGlobalSearchBarProjectModal .euiModalFooter > * {
        flex: 1 1 auto;
        min-inline-size: 0;
      }
      .kbnGlobalSearchBarProjectModal .euiModalFooter p {
        margin-block: 0;
      }
      .kbnGlobalSearchBarProjectModal .euiModalFooter .euiCode {
        background-color: ${euiTheme.colors.backgroundLightText} !important;
        color: ${euiTheme.colors.textParagraph} !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: ${euiTheme.border.radius.small} !important;
        box-sizing: border-box !important;
        min-block-size: 20px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding-block: 0 !important;
        padding-inline: ${euiTheme.size.s} !important;
        line-height: 1 !important;
        vertical-align: middle;
      }
    `,
    [euiTheme]
  );

  if (chromeStyle === 'project') {
    return (
      <>
        {isVisible ? (
          <>
            <Global styles={projectSearchCommandPaletteGlobalCss} />
            <EuiModal
              aria-label={i18nStrings.placeholderText}
              className="kbnGlobalSearchBarProjectModal"
              data-test-subj="nav-search-command-palette"
              initialFocus='[data-test-subj="nav-search-input"]'
              style={{ width: 800, height: '50vh' }}
              onClose={closePalette}
              outsideClickCloses
            >
              <EuiModalBody>
                <EuiSelectable
                  css={[
                    sitewideTemplateStyles.euiSelectableTemplateSitewide,
                    css`
                      width: 100%;
                    `,
                  ]}
                  emptyMessage={<EmptyMessage />}
                  errorMessage={
                    searchCharLimitExceeded ? <SearchCharLimitExceededMessage {...props} /> : null
                  }
                  isLoading={isLoading}
                  isPreFiltered
                  listProps={{
                    className: 'eui-yScroll',
                    onFocusBadge: {
                      iconSide: 'right',
                      children: (
                        <EuiI18n
                          default="Go to"
                          token="euiSelectableTemplateSitewide.onFocusBadgeGoTo"
                        />
                      ),
                    },
                    rowHeight: 68,
                    showIcons: false,
                  }}
                  noMatchesMessage={<PopoverPlaceholder basePath={props.basePathUrl} />}
                  onChange={onChange}
                  options={formattedOptions}
                  renderOption={(option) =>
                    euiSelectableTemplateSitewideRenderOptions(option, searchValue)
                  }
                  searchProps={{
                    append: getAppendForChromeStyle(),
                    autoFocus: true,
                    compressed: true,
                    'aria-label': i18nStrings.placeholderText,
                    'data-test-subj': 'nav-search-input',
                    fullWidth: true,
                    inputRef: setSearchRef,
                    onBlur: () => {
                      reportEvent.searchBlur();
                      setShowAppend(!searchValue.length);
                    },
                    onFocus: () => {
                      reportEvent.searchFocus();
                      setInitialLoad(true);
                      setShowAppend(false);
                    },
                    onInput: (e: React.UIEvent<HTMLInputElement>) =>
                      setSearchValue(e.currentTarget.value),
                    placeholder: i18nStrings.placeholderText,
                    value: searchValue,
                  }}
                  searchable
                  singleSelection
                >
                  {(list, search) => (
                    <>
                      {search}
                      {list}
                    </>
                  )}
                </EuiSelectable>
              </EuiModalBody>
              <EuiModalFooter>
                <PopoverFooter />
              </EuiModalFooter>
            </EuiModal>
          </>
        ) : null}
        <EuiButton
          aria-expanded={isVisible}
          aria-haspopup="dialog"
          aria-label={projectSearchRevealAriaLabel}
          buttonRef={visibilityButtonRef}
          color="text"
          css={projectChromeSearchRevealButtonCss}
          data-test-subj="nav-search-reveal"
          iconType="search"
          size="s"
          onClick={() => {
            if (isVisible) {
              closePalette();
            } else {
              setIsVisible(true);
            }
          }}
        >
          <span className="kbnSearchBarProjectRevealLabel">
            {i18nStrings.projectChromeSearchRevealLabel}
          </span>
          <span
            aria-hidden
            className="kbnSearchBarProjectRevealShortcut"
            css={projectRevealShortcutSurfaceCss}
          >
            <EuiCode css={projectRevealShortcutCodeCss}>
              {isMac
                ? i18nStrings.keyboardShortcutTooltip.onMac
                : i18nStrings.keyboardShortcutTooltip.onNotMac}
            </EuiCode>
          </span>
        </EuiButton>
      </>
    );
  }

  return (
    <EuiSelectableTemplateSitewide
      isLoading={isLoading}
      isPreFiltered
      onChange={onChange}
      options={options}
      css={styles}
      popoverButtonBreakpoints={['xs', 's']}
      singleSelection={true}
      renderOption={(option) => euiSelectableTemplateSitewideRenderOptions(option, searchValue)}
      colorModes={{ search: 'dark', popover: 'global' }}
      listProps={{
        className: 'eui-yScroll',
        css: css`
          max-block-size: 75vh;
        `,
      }}
      searchProps={{
        autoFocus: false,
        value: searchValue,
        onInput: (e: React.UIEvent<HTMLInputElement>) => setSearchValue(e.currentTarget.value),
        'data-test-subj': 'nav-search-input',
        inputRef: setSearchRef,
        compressed: true,
        'aria-label': i18nStrings.placeholderText,
        placeholder: i18nStrings.placeholderText,
        onFocus: () => {
          reportEvent.searchFocus();
          setInitialLoad(true);
          setShowAppend(false);
        },
        onBlur: () => {
          reportEvent.searchBlur();
          setShowAppend(!searchValue.length);
        },
        fullWidth: true,
        append: getAppendForChromeStyle(),
      }}
      errorMessage={searchCharLimitExceeded ? <SearchCharLimitExceededMessage {...props} /> : null}
      emptyMessage={<EmptyMessage />}
      noMatchesMessage={<PopoverPlaceholder basePath={props.basePathUrl} />}
      popoverProps={{
        zIndex: Number(euiTheme.levels.navigation),
        'data-test-subj': 'nav-search-popover',
        panelClassName: 'navSearch__panel',
        repositionOnScroll: true,
        popoverRef: setButtonRef,
        panelStyle: { marginTop: '6px' },
      }}
      popoverButton={
        <EuiHeaderSectionItemButton aria-label={i18nStrings.popoverButton}>
          <EuiIcon size="m" type="magnify" />
        </EuiHeaderSectionItemButton>
      }
      popoverFooter={<PopoverFooter />}
    />
  );
};
