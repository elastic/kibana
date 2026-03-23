/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

const SEARCH_DEBOUNCE_MS = 300;

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

const DESTINATION_TYPE_OPTIONS = [
  {
    value: '',
    text: i18n.translate('xpack.alertingV2.notificationPoliciesSearchBar.destinationType.all', {
      defaultMessage: 'All destinations',
    }),
  },
  {
    value: 'workflow',
    text: i18n.translate(
      'xpack.alertingV2.notificationPoliciesSearchBar.destinationType.workflow',
      { defaultMessage: 'Workflow' }
    ),
  },
];

interface NotificationPoliciesSearchBarProps {
  onSearchChange: (search: string) => void;
  destinationType: string;
  onDestinationTypeChange: (destinationType: string) => void;
  enabled: string;
  onEnabledChange: (enabled: string) => void;
  onRefresh: () => void;
}

export const NotificationPoliciesSearchBar = ({
  onSearchChange,
  destinationType,
  onDestinationTypeChange,
  enabled,
  onEnabledChange,
  onRefresh,
}: NotificationPoliciesSearchBarProps) => {
  const [searchInput, setSearchInput] = useState('');

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
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          options={DESTINATION_TYPE_OPTIONS}
          value={destinationType}
          onChange={(e) => onDestinationTypeChange(e.target.value)}
          aria-label={i18n.translate(
            'xpack.alertingV2.notificationPoliciesSearchBar.destinationTypeAriaLabel',
            { defaultMessage: 'Filter by destination type' }
          )}
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
      <EuiFlexItem grow={false}>
        <EuiButton iconType="refresh" onClick={onRefresh} css={{ blockSize: 32 }}>
          {i18n.translate('xpack.alertingV2.notificationPoliciesSearchBar.refreshButton', {
            defaultMessage: 'Refresh',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
