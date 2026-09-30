/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFieldSearch, EuiText, type Query } from '@elastic/eui';
import { MAX_TAG_LENGTH, MAX_TAGS, TAGS_RESPONSE_LIMIT } from '@kbn/alerting-v2-constants';
import { SelectableFilterPopover, StandardFilterOption } from '@kbn/content-list';
import { TAG_FILTER_ID } from '@kbn/content-list-provider';
import { filter, useFieldQueryFilter } from '@kbn/content-list-toolbar';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';

const TAG_SEARCH_DEBOUNCE_MS = 300;
const TAGS_FILTER_TITLE = i18n.translate('xpack.alertingV2.tagsFilter.label', {
  defaultMessage: 'Tags',
});
const TAG_SEARCH_LABEL = i18n.translate('xpack.alertingV2.tagsFilter.searchPlaceholder', {
  defaultMessage: 'Search tags',
});
const TAGS_FETCH_ERROR_MESSAGE = i18n.translate('xpack.alertingV2.tagsFilter.fetchError', {
  defaultMessage: 'Unable to load tags',
});
const TAGS_SELECTION_LIMIT_MESSAGE = i18n.translate('xpack.alertingV2.tagsFilter.selectionLimit', {
  defaultMessage: 'Maximum of {limit} tags selected. Remove one to select another.',
  values: { limit: MAX_TAGS },
});
const TAGS_CAP_GUIDANCE_MESSAGE = i18n.translate('xpack.alertingV2.tagsFilter.capGuidance', {
  defaultMessage: 'Showing first {cap} most-used, type to search',
  values: { cap: TAGS_RESPONSE_LIMIT },
});

/** Creates a content-list tag filter backed by the supplied tag query hook. */
export const createTagsFilter = ({
  useFetchTags,
  testSubjectPrefix,
}: {
  useFetchTags: (params: { search?: string }) => {
    data?: string[];
    isLoading: boolean;
    isError: boolean;
  };
  testSubjectPrefix: string;
}) => {
  const TagsFilterComponent = ({
    query,
    onChange,
  }: {
    query?: Query;
    onChange?: (query: Query) => void;
  }) => {
    const [tagSearch, setTagSearch] = useState('');
    const debouncedTagSearch = useDebouncedValue(tagSearch, TAG_SEARCH_DEBOUNCE_MS);
    const { selection } = useFieldQueryFilter({
      fieldName: TAG_FILTER_ID,
      query,
      onChange,
    });
    const {
      data: tagNames = [],
      isLoading,
      isError,
    } = useFetchTags({
      search: debouncedTagSearch || undefined,
    });

    const selectedTags = useMemo(() => Object.keys(selection), [selection]);
    const selectionLimitReached = selectedTags.length >= MAX_TAGS;
    const options = useMemo(() => {
      if (selectionLimitReached) {
        return selectedTags.map((tag) => ({ key: tag, label: tag }));
      }

      const apiTagSet = new Set(tagNames);
      const orphans = selectedTags
        .filter((tag) => !apiTagSet.has(tag))
        .map((tag) => ({ key: tag, label: tag }));
      return [...orphans, ...tagNames.map((tag) => ({ key: tag, label: tag }))];
    }, [tagNames, selectedTags, selectionLimitReached]);

    const showCapGuidance = tagNames.length >= TAGS_RESPONSE_LIMIT;

    return (
      <SelectableFilterPopover
        fieldName={TAG_FILTER_ID}
        title={TAGS_FILTER_TITLE}
        query={query}
        onChange={onChange}
        options={options}
        isLoading={isLoading}
        emptyMessage={isError ? TAGS_FETCH_ERROR_MESSAGE : undefined}
        hideSearch
        headerContent={
          <EuiFieldSearch
            compressed
            value={tagSearch}
            maxLength={MAX_TAG_LENGTH}
            onChange={(event) => setTagSearch(event.target.value)}
            placeholder={TAG_SEARCH_LABEL}
            aria-label={TAG_SEARCH_LABEL}
            data-test-subj={`${testSubjectPrefix}Search`}
          />
        }
        footerContent={
          selectionLimitReached ? (
            <EuiText
              size="xs"
              color="subdued"
              data-test-subj={`${testSubjectPrefix}SelectionLimitGuidance`}
            >
              {TAGS_SELECTION_LIMIT_MESSAGE}
            </EuiText>
          ) : showCapGuidance ? (
            <EuiText size="xs" color="subdued" data-test-subj={`${testSubjectPrefix}CapGuidance`}>
              {TAGS_CAP_GUIDANCE_MESSAGE}
            </EuiText>
          ) : undefined
        }
        renderOption={(option, { isActive }) => (
          <StandardFilterOption isActive={isActive}>
            <span data-test-subj={`${testSubjectPrefix}Option-${option.key}`}>{option.label}</span>
          </StandardFilterOption>
        )}
        data-test-subj={testSubjectPrefix}
      />
    );
  };

  return filter.createComponent({
    resolve: () => ({
      type: 'custom_component' as const,
      component: TagsFilterComponent,
    }),
  });
};
