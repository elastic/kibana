/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useFetchTags } from '../../../hooks/use_fetch_tags';

const SEARCH_DEBOUNCE_MS = 300;
const TAG_SEARCH_DEBOUNCE_MS = 200;

const ENABLED_OPTIONS = [
  {
    value: '',
    text: i18n.translate('xpack.alertingV2.notificationPoliciesSearchBar.enabled.all', {
      defaultMessage: 'All states',
    }),
  },
  {
    value: 'true',
    text: i18n.translate('xpack.alertingV2.notificationPoliciesSearchBar.enabled.enabled', {
      defaultMessage: 'Enabled',
    }),
  },
  {
    value: 'false',
    text: i18n.translate('xpack.alertingV2.notificationPoliciesSearchBar.enabled.disabled', {
      defaultMessage: 'Disabled',
    }),
  },
];

interface NotificationPoliciesSearchBarProps {
  onSearchChange: (search: string) => void;
  enabled: string;
  onEnabledChange: (enabled: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export const NotificationPoliciesSearchBar = ({
  onSearchChange,
  enabled,
  onEnabledChange,
  selectedTags,
  onTagsChange,
}: NotificationPoliciesSearchBarProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const debouncedTagQuery = useDebouncedValue(tagSearchQuery, TAG_SEARCH_DEBOUNCE_MS);

  const { data: availableTags, isLoading: isLoadingTags } = useFetchTags({
    search: debouncedTagQuery,
  });

  const tagOptions = (availableTags ?? []).map((tag) => ({ label: tag }));

  useDebounce(
    () => {
      onSearchChange(searchInput);
    },
    SEARCH_DEBOUNCE_MS,
    [onSearchChange, searchInput]
  );

  return (
    <EuiFlexGroup gutterSize="s" direction="row" responsive={false}>
      <EuiFlexItem grow>
        <EuiFieldSearch
          compressed
          fullWidth
          placeholder={i18n.translate(
            'xpack.alertingV2.notificationPoliciesSearchBar.searchPlaceholder',
            { defaultMessage: 'Search notification policies' }
          )}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ minWidth: 200 }}>
        <EuiComboBox
          compressed
          async
          isLoading={isLoadingTags}
          data-test-subj="tagsFilter"
          placeholder={i18n.translate(
            'xpack.alertingV2.notificationPoliciesSearchBar.tagsPlaceholder',
            { defaultMessage: 'Filter by tags' }
          )}
          aria-label={i18n.translate(
            'xpack.alertingV2.notificationPoliciesSearchBar.tagsAriaLabel',
            { defaultMessage: 'Filter by tags' }
          )}
          selectedOptions={selectedTags.map((tag) => ({ label: tag }))}
          options={tagOptions}
          onSearchChange={setTagSearchQuery}
          onChange={(options) => {
            onTagsChange(options.map((o) => o.label));
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          options={ENABLED_OPTIONS}
          value={enabled}
          onChange={(e) => onEnabledChange(e.target.value)}
          aria-label={i18n.translate(
            'xpack.alertingV2.notificationPoliciesSearchBar.enabledAriaLabel',
            { defaultMessage: 'Filter by state' }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
