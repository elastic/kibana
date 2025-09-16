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
  useEuiTheme,
  useEuiBreakpoint,
  mathWithUnits,
  useEuiMinBreakpoint,
  EuiPopover,
  EuiFieldSearch,
} from '@elastic/eui';
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
import { SearchPopoverFooter } from './search_popover_footer';
import { SearchPopoverPlaceholder } from './search_popover_placeholder';
import type { SearchBarProps } from './types';
import { getSearchHighlightStyles, useHighlightAnimation } from './highlight_animation';
import { getOverlayBackdropStyles } from './overlay_styles';
import { VersionSelectorPanel, type DesignVersion } from './version_selector_panel';
import { SearchList } from './search_list';
import { addCustomComponent, createDemoCustomComponent } from './search_list_utils';


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
      <SearchPopoverPlaceholder basePath={props.basePathUrl} customPlaceholderMessage={charLimitMessage} />
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
  const [isOverlayMode, setIsOverlayMode] = useState(false);
  const [designVersion, setDesignVersion] = useState<DesignVersion>('regular-user');
  const [customComponents, setCustomComponents] = useState<React.ReactNode[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Highlight animation hook
  const { isHighlighted, triggerHighlight } = useHighlightAnimation(chromeStyle === 'project');

  // Add demo custom components
  useEffect(() => {
    if (searchValue === '' && customComponents.length === 0) {
      const demoComponent = createDemoCustomComponent('demo-custom');
      addCustomComponent(demoComponent, setCustomComponents);
    }
  }, [searchValue, customComponents.length]);

  const defaultStyles = css({
    [useEuiBreakpoint(['m', 'l'])]: {
      width: mathWithUnits(euiTheme.size.xxl, (x) => x * 10),
    },
    [useEuiMinBreakpoint('xl')]: {
      width: mathWithUnits(euiTheme.size.xxl, (x) => x * 15),
    },
  });
  const projectStyles = css({
    width: 240,
  });
  const baseStyles = chromeStyle === 'project' ? projectStyles : defaultStyles;
  const highlightStyles = getSearchHighlightStyles(euiTheme, colorMode);
  
  // Overlay styles
  const overlayBackdropStyles = getOverlayBackdropStyles(euiTheme);

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

  // Control popover visibility
  useEffect(() => {
    if (initialLoad && (options.length > 0 || customComponents.length > 0)) {
      setIsPopoverOpen(true);
    } else {
      setIsPopoverOpen(false);
    }
  }, [initialLoad, options.length, customComponents.length]);

  // When overlay mode is activated, ensure popover shows immediately and focus input
  useEffect(() => {
    if (isOverlayMode && chromeStyle === 'project') {
      // Ensure we have initial load set and trigger search if no options
      if (!initialLoad) {
        setInitialLoad(true);
      }
      // If we don't have any options yet, set some placeholder to show popover
      if (!options.length && !isLoading) {
        // Set empty options to trigger popover display
        setOptions([]);
        setIsLoading(false);
      }
      
      // Focus the search input and trigger highlight animation when overlay opens
      setTimeout(() => {
        if (searchRef) {
          searchRef.focus();
          triggerHighlight(); // Trigger highlight animation for overlay mode
        }
      }, 100);
    }
  }, [isOverlayMode, chromeStyle, initialLoad, options.length, isLoading, searchRef, triggerHighlight]);

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
      // Filter and modify options based on design version
      let filteredOptions = _options;
      let filteredSuggestions = suggestions;

      if (designVersion === 'new-user') {
        // For new users, prioritize applications and basic features
        filteredOptions = _options.filter((option) => {
          // Prioritize applications and basic dashboards
          return option.type === 'application' || 
                 (option.type === 'dashboard' && !option.title?.toLowerCase().includes('advanced'));
        });
        
        // Limit to top 5 results for new users to avoid overwhelming
        filteredOptions = filteredOptions.slice(0, 5);
        
        // Add helpful suggestions for new users
        if (searchValue.length === 0) {
          filteredSuggestions = [
            { 
              key: 'getting-started', 
              label: 'Getting started', 
              description: 'Learn the basics of Kibana',
              icon: 'help',
              suggestedSearch: 'getting started'
            },
            { 
              key: 'create-dashboard', 
              label: 'Create dashboard', 
              description: 'Build your first dashboard',
              icon: 'dashboardApp',
              suggestedSearch: 'create dashboard'
            },
            { 
              key: 'sample-data', 
              label: 'Sample data', 
              description: 'Explore with sample datasets',
              icon: 'database',
              suggestedSearch: 'sample data'
            },
            ...suggestions.slice(0, 2)
          ];
        }
      } else {
        // For regular users, show all results
        filteredSuggestions = suggestions;
      }

      setOptions([
        ...filteredSuggestions.map(suggestionToOption),
        ...filteredOptions.map((option) =>
          resultToOption(
            option,
            searchTagIds?.filter((id) => id !== UNKNOWN_TAG_ID) ?? [],
            taggingApi?.ui.getTagList
          )
        ),
      ]);
    },
    [setOptions, taggingApi, designVersion, searchValue]
  );

  // When design version changes, refresh the search results immediately
  useEffect(() => {
    if (initialLoad && searchableTypes.length > 0) {
      // Directly trigger the search logic with current parameters
      const suggestions = loadSuggestions(searchValue.toLowerCase());
      let aggregatedResults: GlobalSearchResult[] = [];

      const rawParams = parseSearchParams(searchValue.toLowerCase(), searchableTypes);
      let tagIds: string[] | undefined;
      if (taggingApi && rawParams.filters.tags) {
        tagIds = rawParams.filters.tags.map(
          (tagName) => taggingApi.ui.getTagIdFromName(tagName) ?? UNKNOWN_TAG_ID
        );
      } else {
        tagIds = undefined;
      }

      // For empty search, show applications
      if (searchValue.length === 0) {
        // Create mock application results for immediate display
        aggregatedResults = [];
      }

      // Update the options immediately with the new design version logic
      setDecoratedOptions(aggregatedResults, suggestions, tagIds);
    }
  }, [designVersion, initialLoad, searchableTypes, searchValue, loadSuggestions, setDecoratedOptions, taggingApi]);

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
    [searchValue, loadSuggestions, searchableTypes, initialLoad, designVersion]
  );

  const closeOverlay = useCallback(() => {
    setIsOverlayMode(false);
    if (searchRef) {
      searchRef.blur();
    }
  }, [searchRef]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOverlayMode) {
        event.preventDefault();
        closeOverlay();
        return;
      }
      
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
    [buttonRef, searchRef, reportEvent, isOverlayMode, closeOverlay]
  );

  const handleOptionClick = useCallback(
    (option: EuiSelectableTemplateSitewideOption, event: React.MouseEvent) => {
      const selectedLabel = option.label ?? null;
      const selectedRank = options.findIndex(opt => opt.key === option.key) + 1;

      // @ts-ignore - ts error is "union type is too complex to express"
      const { url, type, suggestion } = option;

      // if the type is a suggestion, we change the query on the input and trigger a new search
      // by setting the searchValue (only setting the field value does not trigger a search)
      if (type === '__suggestion__') {
        setSearchValue(suggestion);
        return;
      }

      // errors in tracking should not prevent selection behavior
      try {
        if (type === 'application') {
          const key = option.key ?? 'unknown';
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
      
      // Close overlay/popover after navigation
      if (isOverlayMode) {
        setIsOverlayMode(false);
      }
      setIsPopoverOpen(false);
    },
    [reportEvent, navigateToUrl, searchRef, searchValue, isOverlayMode, options]
  );

  const clearField = () => setSearchValue('');

  useEvent('keydown', onKeyDown);

  // In project chrome style, render the input immediately (no reveal button)

  const highlightClassName = isHighlighted ? 'search-highlighted' : undefined;

  const renderSearchComponent = (isOverlay = false) => {
    const searchInput = (
      <EuiFieldSearch
        autoFocus={chromeStyle === 'project' && isOverlay}
        value={searchValue}
        onInput={(e: React.UIEvent<HTMLInputElement>) => setSearchValue(e.currentTarget.value)}
        data-test-subj="nav-search-input"
        inputRef={setSearchRef}
        compressed={isOverlay ? false : true}
        aria-label={i18nStrings.placeholderText}
        placeholder={i18nStrings.placeholderText}
        onFocus={() => {
          reportEvent.searchFocus();
          setInitialLoad(true);
          triggerHighlight();
          if (chromeStyle === 'project') {
            setIsOverlayMode(true);
            // Force initial load to show popover immediately
            if (!initialLoad) {
              setInitialLoad(true);
            }
          } else {
            // For non-project chrome, open popover on focus
            setIsPopoverOpen(true);
          }
        }}
        onBlur={(e) => {
          reportEvent.searchBlur();
          // Delay closing overlay/popover to allow for clicks on search results
          setTimeout(() => {
            if (isOverlayMode && !e.currentTarget.contains(document.activeElement)) {
              setIsOverlayMode(false);
            }
            // For non-project chrome, close popover on blur if no results are being interacted with
            if (chromeStyle !== 'project' && !e.currentTarget.contains(document.activeElement)) {
              const popover = document.querySelector('[data-test-subj="nav-search-popover"]');
              if (popover && !popover.contains(document.activeElement)) {
                setIsPopoverOpen(false);
              }
            }
          }, 150);
        }}
        fullWidth={true}
        css={css`
          .euiFormControlLayout {
            ${isOverlay ? `
              border-radius: ${euiTheme.border.radius.medium};
              box-shadow: 0 6px 36px -4px rgba(69, 90, 100, 0.3), 0 24px 64px -8px rgba(69, 90, 100, 0.3);
              background-color: ${euiTheme.colors.backgroundBasePlain};
            ` : ''}
          }
          ${highlightStyles}
        `}
        className={highlightClassName}
      />
    );

    const listContent = (() => {
      if (searchCharLimitExceeded) {
        return <SearchCharLimitExceededMessage {...props} />;
      }
      
      if (!initialLoad || (!options.length && !customComponents.length && isLoading)) {
        return <EmptyMessage />;
      }
      
      if (!options.length && !customComponents.length) {
        return <SearchPopoverPlaceholder basePath={props.basePathUrl} />;
      }

      return (
        <SearchList
          options={options}
          searchValue={searchValue}
          onOptionClick={handleOptionClick}
          isLoading={isLoading}
          customComponents={customComponents}
          emptyMessage={<SearchPopoverPlaceholder basePath={props.basePathUrl} />}
          showSuggestedTitle={true}
        />
      );
    })();

    const popoverContent = (
      <div
        css={css`
          width: 700px;
          max-width: 90vw;
        `}
      >
        {listContent}
        <SearchPopoverFooter isMac={isMac} />
      </div>
    );

    // For project chrome style, handle overlay mode differently
    if (chromeStyle === 'project') {
      return isOverlay ? (
        <div
          css={css`
            width: 100%;
            max-width: 700px;
            position: relative;
            ${highlightStyles}
          `}
          className={highlightClassName}
        >
          {searchInput}
          <div
            css={css`
              position: absolute;
              top: 100%;
              left: 0;
              right: 0;
              z-index: ${Number(euiTheme.levels.modal) + 1};
              margin-top: 8px;
              border-radius: ${euiTheme.border.radius.medium};
              box-shadow: 0 6px 36px -4px rgba(69, 90, 100, 0.3), 0 24px 64px -8px rgba(69, 90, 100, 0.3);
              background-color: ${euiTheme.colors.backgroundBasePlain};
            `}
          >
            {popoverContent}
          </div>
        </div>
      ) : (
        <div css={highlightStyles} className={highlightClassName}>
          {searchInput}
        </div>
      );
    }

    // For non-project chrome styles, use regular popover
    return (
      <EuiPopover
        button={
          <EuiHeaderSectionItemButton aria-label={i18nStrings.popoverButton}>
            <EuiIcon type="search" size="m" />
          </EuiHeaderSectionItemButton>
        }
        isOpen={isPopoverOpen && !isOverlay}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        zIndex={Number(euiTheme.levels.navigation)}
        data-test-subj="nav-search-popover"
        panelClassName="navSearch__panel"
        repositionOnScroll={true}
        popoverRef={setButtonRef}
        panelStyle={{ marginTop: '6px' }}
        hasArrow={false}
        css={styles}
        className={highlightClassName}
      >
        {searchInput}
        {popoverContent}
      </EuiPopover>
    );
  };

  return (
    <>
      {/* Header search - hidden when overlay is active */}
      <div style={{ visibility: isOverlayMode ? 'hidden' : 'visible' }}>
        {renderSearchComponent(false)}
      </div>
      
      {/* Overlay search */}
      {isOverlayMode && (
        <div
          css={overlayBackdropStyles}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeOverlay();
            }
          }}
        >
          {renderSearchComponent(true)}
        </div>
      )}
      
      {/* Version selector panel - only show in project chrome style */}
      {chromeStyle === 'project' && (
        <VersionSelectorPanel
          selectedVersion={designVersion}
          onVersionChange={setDesignVersion}
        />
      )}
    </>
  );
};
