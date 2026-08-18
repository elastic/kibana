/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { SignalFilter } from './services_step/use_services_step';

export const SIGNAL_FILTER_OPTIONS = [
  {
    id: 'all' as SignalFilter,
    label: i18n.translate('xpack.ingestHub.serviceSearchFilter.all', {
      defaultMessage: 'All',
    }),
  },
  {
    id: 'logs' as SignalFilter,
    label: i18n.translate('xpack.ingestHub.serviceSearchFilter.logs', {
      defaultMessage: 'Logs',
    }),
  },
  {
    id: 'metrics' as SignalFilter,
    label: i18n.translate('xpack.ingestHub.serviceSearchFilter.metrics', {
      defaultMessage: 'Metrics',
    }),
  },
];

interface ServiceSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  signalFilter: SignalFilter;
  onSignalFilterChange: (filter: SignalFilter) => void;
  searchPlaceholder?: string;
  searchTestSubj?: string;
  filterTestSubj?: string;
}

export function ServiceSearchFilter({
  searchQuery,
  onSearchChange,
  signalFilter,
  onSignalFilterChange,
  searchPlaceholder,
  searchTestSubj = 'serviceSearchFilter-searchBox',
  filterTestSubj = 'serviceSearchFilter-signalFilter',
}: ServiceSearchFilterProps) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiFieldSearch
          fullWidth
          compressed
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={
            searchPlaceholder ??
            i18n.translate('xpack.ingestHub.serviceSearchFilter.placeholder', {
              defaultMessage: 'Search services',
            })
          }
          data-test-subj={searchTestSubj}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend={i18n.translate('xpack.ingestHub.serviceSearchFilter.legend', {
            defaultMessage: 'Filter by signal type',
          })}
          options={SIGNAL_FILTER_OPTIONS}
          idSelected={signalFilter}
          onChange={(id) => onSignalFilterChange(id as SignalFilter)}
          buttonSize="compressed"
          data-test-subj={filterTestSubj}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
