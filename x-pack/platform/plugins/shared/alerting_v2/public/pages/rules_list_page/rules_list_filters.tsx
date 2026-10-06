/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Query } from '@elastic/eui';
import { RULE_KIND_LABELS } from '@kbn/alerting-v2-constants';
import { SelectableFilterPopover, StandardFilterOption } from '@kbn/content-list';
import type { FieldDefinition } from '@kbn/content-list-provider';
import { filter } from '@kbn/content-list-toolbar';
import { i18n } from '@kbn/i18n';
import { createTagsFilter } from '../../components/create_tags_filter';
import { useFetchRuleTags } from '../../hooks/use_fetch_rule_tags';
import { ENABLED_FILTER_ID, KIND_FILTER_ID, TAG_FILTER_ID } from './rules_query_params';

const STATUS_FILTER_TITLE = i18n.translate('xpack.alertingV2.rulesList.statusFilter.label', {
  defaultMessage: 'Status',
});

const KIND_FILTER_TITLE = i18n.translate('xpack.alertingV2.rulesList.kindFilter.label', {
  defaultMessage: 'Outcome',
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

export const TagsFilter = createTagsFilter({
  useFetchTags: useFetchRuleTags,
  testSubjectPrefix: 'rulesListTagsFilter',
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
