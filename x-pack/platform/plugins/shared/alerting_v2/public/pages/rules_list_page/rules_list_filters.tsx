/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Query } from '@elastic/eui';
import { SelectableFilterPopover, StandardFilterOption } from '@kbn/content-list';
import type { FieldDefinition } from '@kbn/content-list-provider';
import { filter } from '@kbn/content-list-toolbar';
import { i18n } from '@kbn/i18n';
import { useFetchRuleTags } from '../../hooks/use_fetch_rule_tags';
import { ENABLED_FILTER_ID, KIND_FILTER_ID, TAG_FILTER_ID } from './rules_query_params';

const STATUS_FILTER_TITLE = i18n.translate('xpack.alertingV2.rulesList.statusFilter.label', {
  defaultMessage: 'Status',
});

const MODE_FILTER_TITLE = i18n.translate('xpack.alertingV2.rulesList.modeFilter.label', {
  defaultMessage: 'Mode',
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

export const MODE_FILTER_OPTIONS = [
  {
    key: 'alert' as const,
    label: i18n.translate('xpack.alertingV2.rulesList.modeFilter.alert', {
      defaultMessage: 'Alert',
    }),
  },
  {
    key: 'signal' as const,
    label: i18n.translate('xpack.alertingV2.rulesList.modeFilter.signal', {
      defaultMessage: 'Signal',
    }),
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

const ModeFilterComponent = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => (
  <SelectableFilterPopover
    fieldName={KIND_FILTER_ID}
    title={MODE_FILTER_TITLE}
    query={query}
    onChange={onChange}
    options={MODE_FILTER_OPTIONS}
    renderOption={(option, { isActive }) => (
      <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
    )}
    singleSelection
    data-test-subj="rulesListModeFilter"
  />
);

export const ModeFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: ModeFilterComponent,
  }),
});

const TagsFilterComponent = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => {
  const { data: tagNames = [] } = useFetchRuleTags();
  const options = useMemo(() => tagNames.map((tag) => ({ key: tag, label: tag })), [tagNames]);
  return (
    <SelectableFilterPopover
      fieldName={TAG_FILTER_ID}
      title={TAGS_FILTER_TITLE}
      query={query}
      onChange={onChange}
      options={options}
      renderOption={(option, { isActive }) => (
        <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
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
  resolveIdToDisplay: (id) => MODE_FILTER_OPTIONS.find((o) => o.key === id)?.label ?? id,
  resolveDisplayToId: (displayValue) =>
    MODE_FILTER_OPTIONS.find((o) => o.label === displayValue)?.key,
  resolveFuzzyDisplayToIds: (partial) => {
    const lower = partial.toLowerCase();
    return MODE_FILTER_OPTIONS.filter((o) => o.label.toLowerCase().includes(lower)).map(
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
