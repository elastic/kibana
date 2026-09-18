/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { Query } from '@elastic/eui';
import { RULE_KIND_LABELS } from '@kbn/alerting-v2-constants';
import { EuiFieldSearch, EuiText } from '@elastic/eui';
import { SelectableFilterPopover, StandardFilterOption } from '@kbn/content-list';
import type { FieldDefinition } from '@kbn/content-list-provider';
import { filter, useFieldQueryFilter } from '@kbn/content-list-toolbar';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import { TAGS_RESPONSE_LIMIT } from '@kbn/alerting-v2-constants';
import { useFetchRuleTags } from '../../hooks/use_fetch_rule_tags';
import { ENABLED_FILTER_ID, KIND_FILTER_ID, TAG_FILTER_ID } from './rules_query_params';

const TAG_SEARCH_DEBOUNCE_MS = 300;

const STATUS_FILTER_TITLE = i18n.translate('xpack.alertingV2.rulesList.statusFilter.label', {
  defaultMessage: 'Status',
});

const KIND_FILTER_TITLE = i18n.translate('xpack.alertingV2.rulesList.kindFilter.label', {
  defaultMessage: 'Outcome',
});

const TAGS_FILTER_TITLE = i18n.translate('xpack.alertingV2.rulesList.tagsFilter.label', {
  defaultMessage: 'Tags',
});

export const STATUS_FILTER_OPTIONS = [
  {
    key: 'true' as const,
    label: i18n.translate('xpack.alertingV2.rulesList.statusFilter.enabled', {
      defaultMessage: 'Enabled',
    }),
  },
  {
    key: 'false' as const,
    label: i18n.translate('xpack.alertingV2.rulesList.statusFilter.disabled', {
      defaultMessage: 'Disabled',
    }),
  },
];

export const KIND_FILTER_OPTIONS = [
  {
    key: 'alert' as const,
    label: RULE_KIND_LABELS.alert,
  },
  {
    key: 'signal' as const,
    label: RULE_KIND_LABELS.signal,
  },
];

const StatusFilterComponent = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => (
  <SelectableFilterPopover
    fieldName={ENABLED_FILTER_ID}
    title={STATUS_FILTER_TITLE}
    query={query}
    hideSearch={true}
    onChange={onChange}
    options={STATUS_FILTER_OPTIONS}
    renderOption={(option, { isActive }) => (
      <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
    )}
    singleSelection
    data-test-subj="rulesListStatusFilter"
  />
);

export const StatusFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: StatusFilterComponent,
  }),
});

const KindFilterComponent = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => (
  <SelectableFilterPopover
    fieldName={KIND_FILTER_ID}
    title={KIND_FILTER_TITLE}
    query={query}
    hideSearch={true}
    onChange={onChange}
    options={KIND_FILTER_OPTIONS}
    renderOption={(option, { isActive }) => (
      <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
    )}
    singleSelection
    data-test-subj="rulesListKindFilter"
  />
);

export const KindFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: KindFilterComponent,
  }),
});

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
  const { data: tagNames = [], isLoading } = useFetchRuleTags({
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
          onChange={(event) => setTagSearch(event.target.value)}
          placeholder={i18n.translate('xpack.alertingV2.rulesList.tagsFilter.searchPlaceholder', {
            defaultMessage: 'Search tags',
          })}
          data-test-subj="rulesListTagsFilterSearch"
        />
      }
      footerContent={
        showCapGuidance ? (
          <EuiText size="xs" color="subdued" data-test-subj="rulesListTagsFilterCapGuidance">
            {i18n.translate('xpack.alertingV2.rulesList.tagsFilter.capGuidance', {
              defaultMessage: 'Showing first {cap} most-used, type to search',
              values: { cap: TAGS_RESPONSE_LIMIT },
            })}
          </EuiText>
        ) : undefined
      }
      renderOption={(option, { isActive }) => (
        <StandardFilterOption isActive={isActive}>
          <span data-test-subj={`rulesListTagsFilterOption-${option.key}`}>{option.label}</span>
        </StandardFilterOption>
      )}
      data-test-subj="rulesListTagsFilter"
    />
  );
};

export const TagsFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: TagsFilterComponent,
  }),
});

const enabledFieldDefinition: FieldDefinition = {
  fieldName: ENABLED_FILTER_ID,
  resolveIdToDisplay: (id) => STATUS_FILTER_OPTIONS.find((o) => o.key === id)?.label ?? id,
  resolveDisplayToId: (displayValue) =>
    STATUS_FILTER_OPTIONS.find((o) => o.label === displayValue)?.key,
  resolveFuzzyDisplayToIds: (partial) => {
    const lower = partial.toLowerCase();
    return STATUS_FILTER_OPTIONS.filter((o) => o.label.toLowerCase().includes(lower)).map(
      (o) => o.key
    );
  },
};

const kindFieldDefinition: FieldDefinition = {
  fieldName: KIND_FILTER_ID,
  resolveIdToDisplay: (id) => KIND_FILTER_OPTIONS.find((o) => o.key === id)?.label ?? id,
  resolveDisplayToId: (displayValue) =>
    KIND_FILTER_OPTIONS.find((o) => o.label === displayValue)?.key,
  resolveFuzzyDisplayToIds: (partial) => {
    const lower = partial.toLowerCase();
    return KIND_FILTER_OPTIONS.filter((o) => o.label.toLowerCase().includes(lower)).map(
      (o) => o.key
    );
  },
};

const tagFieldDefinition: FieldDefinition = {
  fieldName: TAG_FILTER_ID,
  resolveIdToDisplay: (id) => id,
  resolveDisplayToId: (displayValue) => displayValue,
};

export const RULES_LIST_FEATURES_FIELDS: FieldDefinition[] = [
  enabledFieldDefinition,
  kindFieldDefinition,
  tagFieldDefinition,
];
