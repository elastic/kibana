/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableTemplateSitewideOption } from '@elastic/eui';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import type { GlobalSearchFindParams, GlobalSearchResult } from '@kbn/global-search-plugin/public';
import useDebounce from 'react-use/lib/useDebounce';
import { apm } from '@elastic/apm-rum';
import useMountedState from 'react-use/lib/useMountedState';
import type { SearchSuggestion } from '../suggestions';
import { getSuggestions } from '../suggestions';
import type { SearchProps } from '../components/types';
import { resultToOption, suggestionToOption } from '../lib';
import { parseSearchParams } from '../search_syntax';
import { sort } from '../components';

const UNKNOWN_TAG_ID = '__unknown__';

interface UseSearchStateOptions extends Omit<SearchProps, 'basePathUrl'> {
  /** Called after a result is selected and navigation is triggered. */
  onResultSelect?: () => void;
}

export interface SearchStateResult {
  searchValue: string;
  setSearchValue: (value: string) => void;
  options: EuiSelectableTemplateSitewideOption[];
  isLoading: boolean;
  searchCharLimitExceeded: boolean;
  searchRef: RefObject<HTMLInputElement | null>;
  setSearchRef: (ref: HTMLInputElement | null) => void;
  triggerInitialLoad: () => void;
  onChange: (
    selection: EuiSelectableTemplateSitewideOption[],
    event: EuiSelectableOnChangeEvent
  ) => void;
}

export const useSearchState = ({
  globalSearch,
  taggingApi,
  navigateToUrl,
  reportEvent,
  onResultSelect,
}: UseSearchStateOptions): SearchStateResult => {
  const isMounted = useMountedState();

  const [initialLoad, setInitialLoad] = useState(false);
  const [searchValue, setSearchValue] = useState<string>('');
  const [options, setOptions] = useState<EuiSelectableTemplateSitewideOption[]>([]);
  const [searchableTypes, setSearchableTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchCharLimitExceeded, setSearchCharLimitExceeded] = useState(false);

  const searchSubscription = useRef<Subscription | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const setSearchRef = useCallback((ref: HTMLInputElement | null) => {
    searchRef.current = ref;
  }, []);

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

  // Cleanup subscription when component unmounts
  useEffect(() => {
    return () => {
      searchSubscription.current?.unsubscribe();
    };
  }, []);

  const triggerInitialLoad = useCallback(() => {
    setInitialLoad(true);
  }, []);

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

  const onResultSelectRef = useRef(onResultSelect);
  onResultSelectRef.current = onResultSelect;

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

      onResultSelectRef.current?.();
    },
    [reportEvent, navigateToUrl, searchValue]
  );

  return {
    searchValue,
    setSearchValue,
    options,
    isLoading,
    searchCharLimitExceeded,
    onChange,
    setSearchRef,
    searchRef,
    triggerInitialLoad,
  };
};
