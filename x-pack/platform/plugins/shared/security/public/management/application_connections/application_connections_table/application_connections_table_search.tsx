/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarOnChangeArgs, EuiSearchBarProps } from '@elastic/eui';
import { countBy } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';

import {
  applicationConnectionMatchesFreeText,
  applicationConnectionMatchesStatus,
  applicationConnectionsMatchesFreeText,
  toApplicationConnectionList,
} from './application_connections_filters';
import { ViewModeToggle } from './application_connections_view_mode_toggle';
import { FilterOptionWithMatchesBadge } from './filter_option_with_matches_badge';
import { labels } from '../constants/i18n';
import type {
  ApplicationConnection,
  ApplicationConnections,
  ApplicationConnectionStatusFilter,
  ApplicationConnectionsViewMode,
} from '../constants/types';
import { useApplicationConnections } from '../hooks/use_application_connections';

const STATUS_LABELS: Record<ApplicationConnectionStatusFilter, string> = {
  connected: labels.filters.statusConnected,
  revoked: labels.filters.statusRevoked,
};

export interface UseApplicationConnectionsTableSearchOptions {
  toolsLeft?: EuiSearchBarProps['toolsLeft'];
}

interface ApplicationConnectionsTableSearchBase {
  searchConfig: EuiSearchBarProps;
}

export interface GroupedApplicationConnectionsTableSearch
  extends ApplicationConnectionsTableSearchBase {
  viewMode: 'grouped';
  results: ApplicationConnections[];
}

export interface ListApplicationConnectionsTableSearch
  extends ApplicationConnectionsTableSearchBase {
  viewMode: 'list';
  results: ApplicationConnection[];
}

export type ApplicationConnectionsTableSearch =
  | GroupedApplicationConnectionsTableSearch
  | ListApplicationConnectionsTableSearch;

export const useApplicationConnectionsTableSearch = ({
  toolsLeft,
}: UseApplicationConnectionsTableSearchOptions = {}): ApplicationConnectionsTableSearch => {
  const { applicationConnections } = useApplicationConnections();
  const [viewMode, setViewMode] = useState<ApplicationConnectionsViewMode>('grouped');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ApplicationConnectionStatusFilter[]>([]);

  const handleChange = useCallback((args: EuiSearchBarOnChangeArgs) => {
    if (args.error || !args.query) return;

    const statusValues = new Set<ApplicationConnectionStatusFilter>();
    const orClause = args.query.getOrFieldClause('status');
    if (orClause) {
      const raw = Array.isArray(orClause.value) ? orClause.value : [orClause.value];
      for (const value of raw) {
        if (value === 'connected' || value === 'revoked') statusValues.add(value);
      }
    }
    const simpleClause = args.query.getSimpleFieldClause('status');
    if (simpleClause) {
      const value = simpleClause.value;
      if (value === 'connected' || value === 'revoked') statusValues.add(value);
    }
    setStatusFilter(Array.from(statusValues));

    const cleanedQuery = args.query
      .removeOrFieldClauses('status')
      .removeSimpleFieldClauses('status');
    setSearchQuery(cleanedQuery.text.trim());
  }, []);

  const matchesByStatus = useMemo(
    () =>
      countBy(toApplicationConnectionList(applicationConnections), ({ client, connection }) =>
        !client.revoked && !connection.revoked ? 'connected' : 'revoked'
      ),
    [applicationConnections]
  );

  const searchConfig: EuiSearchBarProps = useMemo(
    () => ({
      box: {
        incremental: true,
        placeholder: labels.search.placeholder,
        'aria-label': labels.search.ariaLabel,
      },
      filters: [
        {
          type: 'field_value_selection',
          field: 'status',
          name: labels.filters.statusLabel,
          multiSelect: 'or',
          options: (Object.keys(STATUS_LABELS) as ApplicationConnectionStatusFilter[]).map(
            (value) => ({
              value,
              name: STATUS_LABELS[value],
              view: (
                <FilterOptionWithMatchesBadge
                  name={STATUS_LABELS[value]}
                  matches={matchesByStatus[value] ?? 0}
                />
              ),
            })
          ),
        },
      ],
      onChange: handleChange,
      toolsLeft,
      toolsRight: <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />,
    }),
    [handleChange, matchesByStatus, toolsLeft, viewMode]
  );

  const groupedResults = useMemo<ApplicationConnections[]>(
    () =>
      applicationConnections
        .filter((applicationConnection) =>
          applicationConnectionsMatchesFreeText(applicationConnection, searchQuery)
        )
        .flatMap((applicationConnection) => {
          const matchingConnections = applicationConnection.connections.filter((connection) =>
            applicationConnectionMatchesStatus(
              { client: applicationConnection.client, connection },
              statusFilter
            )
          );
          if (matchingConnections.length === 0) return [];
          return [{ ...applicationConnection, connections: matchingConnections }];
        }),
    [applicationConnections, searchQuery, statusFilter]
  );

  const listResults = useMemo<ApplicationConnection[]>(() => {
    const flat = toApplicationConnectionList(applicationConnections);
    return flat.filter(
      (applicationConnection) =>
        applicationConnectionMatchesFreeText(applicationConnection, searchQuery) &&
        applicationConnectionMatchesStatus(applicationConnection, statusFilter)
    );
  }, [applicationConnections, searchQuery, statusFilter]);

  if (viewMode === 'grouped') {
    return { searchConfig, viewMode, results: groupedResults };
  }
  return { searchConfig, viewMode, results: listResults };
};
