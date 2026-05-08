/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiSearchBar,
  type EuiSearchBarProps,
  type EuiSearchBarOnChangeArgs,
  type Search,
} from '@elastic/eui';
import type { OAuthClient } from '@kbn/agent-builder-common';
import { countBy } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { useQueryState } from '../../hooks/use_query_state';
import { labels } from '../../utils/i18n';
import { FilterOptionWithMatchesBadge } from '../common/filter_option_with_matches_badge';
import {
  getMcpClientStatus,
  McpClientStatus,
  mcpClientStatusValues,
} from './mcp_client_status_indicator';

interface OAuthClientWithStatus extends OAuthClient {
  status: McpClientStatus | null;
}

const toValidSearchQuery = (query: string | null): string => {
  try {
    const queryString = query ?? '';
    EuiSearchBar.Query.parse(queryString);
    return queryString;
  } catch (error) {
    return '';
  }
};

const getMcpClientsTableSearchConfig = ({
  matchesByStatus,
}: {
  matchesByStatus: Record<string, number>;
}): EuiSearchBarProps => ({
  box: {
    incremental: true,
    placeholder: labels.tools.mcpClients.searchMcpClientsPlaceholder,
  },
  filters: [
    {
      type: 'field_value_selection',
      field: 'status',
      name: labels.tools.mcpClients.statusFilter,
      multiSelect: 'or',
      options: Object.values(McpClientStatus).map((status) => ({
        value: status,
        name: mcpClientStatusValues[status].label,
        view: (
          <FilterOptionWithMatchesBadge
            name={mcpClientStatusValues[status].label}
            matches={matchesByStatus[status] ?? 0}
          />
        ),
      })),
      autoSortOptions: false,
    },
  ],
});

export interface McpClientsTableSearch {
  searchConfig: Search;
  results: OAuthClient[];
}

export interface UseMcpClientsTableSearchOptions {
  clients: OAuthClient[];
}

export const useMcpClientsTableSearch = ({
  clients,
}: UseMcpClientsTableSearchOptions): McpClientsTableSearch => {
  const [searchQuery, setSearchQuery] = useQueryState('search', {
    defaultValue: '',
    parse: toValidSearchQuery,
  });

  const clientsWithStatus = useMemo<OAuthClientWithStatus[]>(
    () => clients.map((client) => ({ ...client, status: getMcpClientStatus(client) })),
    [clients]
  );

  const results = useMemo(() => {
    if (!searchQuery) {
      return clientsWithStatus;
    }
    try {
      const query = EuiSearchBar.Query.parse(searchQuery);
      return EuiSearchBar.Query.execute(query, clientsWithStatus, {
        defaultFields: ['client_name'],
      });
    } catch {
      return clientsWithStatus;
    }
  }, [clientsWithStatus, searchQuery]);

  const matchesByStatus = useMemo(() => countBy(clientsWithStatus, 'status'), [clientsWithStatus]);

  const handleChange = useCallback(
    ({ queryText, error: searchError }: EuiSearchBarOnChangeArgs) => {
      if (searchError) {
        return;
      }

      setSearchQuery(queryText);
    },
    [setSearchQuery]
  );

  const searchConfig: Search = useMemo(() => {
    return {
      ...getMcpClientsTableSearchConfig({ matchesByStatus }),
      onChange: handleChange,
      query: searchQuery,
    };
  }, [handleChange, searchQuery, matchesByStatus]);

  return {
    searchConfig,
    results,
  };
};
