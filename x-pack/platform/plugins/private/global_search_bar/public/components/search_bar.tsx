/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableTemplateSitewideOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiText,
  EuiLoadingSpinner,
  EuiSelectableTemplateSitewide,
  euiSelectableTemplateSitewideRenderOptions,
  useEuiTheme,
  useEuiBreakpoint,
  mathWithUnits,
  useEuiMinBreakpoint,
} from '@elastic/eui';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { GlobalSearchFindParams, GlobalSearchResult } from '@kbn/global-search-plugin/public';
import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apm } from '@elastic/apm-rum';
import useDebounce from 'react-use/lib/useDebounce';
import useEvent from 'react-use/lib/useEvent';
import useMountedState from 'react-use/lib/useMountedState';
import useObservable from 'react-use/lib/useObservable';
import type { Subscription } from 'rxjs';
import { blurEvent, isMac, sort } from '.';
import { resultToOption, suggestionToOption } from '../lib';
import { parseSearchParams } from '../search_syntax';
import { i18nStrings } from '../strings';
import type { SearchSuggestion } from '../suggestions';
import { getSuggestions } from '../suggestions';
import { PopoverFooter } from './popover_footer';
import { PopoverPlaceholder } from './popover_placeholder';
import type { SearchBarProps } from './types';
import { getSearchHighlightStyles, useHighlightAnimation } from './highlight_animation';

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
  const { euiTheme, colorMode } = useEuiTheme();
  const chromeStyle = useObservable(chromeStyle$);

  // General hooks
  const [initialLoad, setInitialLoad] = useState(false);
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);
  const [buttonRef, setButtonRef] = useState<HTMLDivElement | null>(null);
  const searchSubscription = useRef<Subscription | null>(null);
  const [options, setOptions] = useState<EuiSelectableTemplateSitewideOption[]>([]);
  const [searchableTypes, setSearchableTypes] = useState<string[]>([]);
  const UNKNOWN_TAG_ID = '__unknown__';
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchCharLimitExceeded, setSearchCharLimitExceeded] = useState(false);

  // Highlight animation hook
  const { isHighlighted, triggerHighlight } = useHighlightAnimation(chromeStyle === 'project');

  const defaultStyles = css({
    [useEuiBreakpoint(['m', 'l'])]: {
      width: mathWithUnits(euiTheme.size.xxl, (x) => x * 10),
    },
    [useEuiMinBreakpoint('xl')]: {
      width: mathWithUnits(euiTheme.size.xxl, (x) => x * 15),
    },
  });
  const projectStyles = css({
    width: 300,
  });
  const baseStyles = chromeStyle === 'project' ? projectStyles : defaultStyles;
  const highlightStyles = getSearchHighlightStyles(euiTheme, colorMode);
  const styles = css([baseStyles, highlightStyles]);
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
        if (searchRef) {
          searchRef.focus();
        } else if (buttonRef) {
          (buttonRef.children[0] as HTMLButtonElement).click();
        }
      }
    },
    [buttonRef, searchRef, reportEvent]
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

      (document.activeElement as HTMLElement).blur();
      if (searchRef) {
        clearField();
        searchRef.dispatchEvent(blurEvent);
      }
    },
    [reportEvent, navigateToUrl, searchRef, searchValue]
  );

  const clearField = () => setSearchValue('');

  useEvent('keydown', onKeyDown);

  // In project chrome style, render the input immediately (no reveal button)

  const highlightClassName = isHighlighted ? 'search-highlighted' : undefined;

  return (
    <EuiSelectableTemplateSitewide
      isLoading={isLoading}
      isPreFiltered
      onChange={onChange}
      options={options}
      css={styles}
      className={highlightClassName}
      popoverButtonBreakpoints={['xs', 's']}
      singleSelection={true}
      renderOption={(option) => euiSelectableTemplateSitewideRenderOptions(option, searchValue)}
      colorModes={chromeStyle !== 'project' ? { search: 'dark', popover: 'global' } : undefined}
      listProps={{
        className: 'eui-yScroll',
        css: css`
          max-block-size: 75vh;
        `,
      }}
      searchProps={{
        autoFocus: chromeStyle === 'project',
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
          triggerHighlight();
        },
        onBlur: () => {
          reportEvent.searchBlur();
        },
        fullWidth: true,
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
          <EuiIcon type="search" size="m" />
        </EuiHeaderSectionItemButton>
      }
      popoverFooter={<PopoverFooter isMac={isMac} />}
    />
  );
};
