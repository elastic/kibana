/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFieldSearch, EuiText, type Query } from '@elastic/eui';
import { MAX_TAG_LENGTH, TAGS_RESPONSE_LIMIT } from '@kbn/alerting-v2-constants';
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

/** Creates a content-list tag filter backed by the supplied tag query hook. */
export const createTagsFilter = ({
  useFetchTags,
  testSubjectPrefix,
}: {
  useFetchTags: (params: { search?: string }) => { data?: string[]; isLoading: boolean };
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
    const { data: tagNames = [], isLoading } = useFetchTags({
      search: debouncedTagSearch || undefined,
    });

    const options = useMemo(() => {
      const apiTagSet = new Set(tagNames);
      const orphans = Object.keys(selection)
        .filter((tag) => !apiTagSet.has(tag))
        .map((tag) => ({ key: tag, label: tag }));
      return [...orphans, ...tagNames.map((tag) => ({ key: tag, label: tag }))];
    }, [tagNames, selection]);

    const showCapGuidance = tagNames.length >= TAGS_RESPONSE_LIMIT;

    return (
      <SelectableFilterPopover
        fieldName={TAG_FILTER_ID}
        title={TAGS_FILTER_TITLE}
        query={query}
        onChange={onChange}
        options={options}
        isLoading={isLoading}
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
          showCapGuidance ? (
            <EuiText size="xs" color="subdued" data-test-subj={`${testSubjectPrefix}CapGuidance`}>
              {i18n.translate('xpack.alertingV2.tagsFilter.capGuidance', {
                defaultMessage: 'Showing first {cap} most-used, type to search',
                values: { cap: TAGS_RESPONSE_LIMIT },
              })}
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
