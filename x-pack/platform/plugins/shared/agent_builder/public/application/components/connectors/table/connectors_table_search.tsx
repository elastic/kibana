/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarOnChangeArgs, EuiSearchBarProps, Search } from '@elastic/eui';
import { EuiSearchBar, type Query } from '@elastic/eui';
import { countBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { OAUTH_STATUS } from '../../../../../common/http_api/tools';
import { useListConnectors } from '../../../hooks/tools/use_mcp_connectors';
import { useKibana } from '../../../hooks/use_kibana';
import { labels } from '../../../utils/i18n';
import { FilterOptionWithMatchesBadge } from '../../common/filter_option_with_matches_badge';

const getConnectorsTableSearchConfig = ({
  matchesByType,
  matchesByStatus,
  actionTypeRegistry,
}: {
  matchesByType: Record<string, number>;
  matchesByStatus: Record<string, number>;
  actionTypeRegistry: {
    has: (id: string) => boolean;
    get: (id: string) => { actionTypeTitle?: string };
  };
}): EuiSearchBarProps => ({
  box: {
    incremental: true,
    placeholder: labels.connectors.searchConnectorsPlaceholder,
    'data-test-subj': 'agentBuilderConnectorsSearchInput',
  },
  filters: [
    {
      type: 'field_value_selection',
      field: 'actionTypeId',
      name: labels.connectors.typeFilter,
      multiSelect: 'or',
      options: Object.keys(matchesByType).map((actionTypeId) => {
        const typeName = actionTypeRegistry.has(actionTypeId)
          ? actionTypeRegistry.get(actionTypeId).actionTypeTitle ?? actionTypeId
          : actionTypeId;
        return {
          value: actionTypeId,
          name: typeName,
          view: (
            <FilterOptionWithMatchesBadge
              name={typeName}
              matches={matchesByType[actionTypeId] ?? 0}
            />
          ),
        };
      }),
      autoSortOptions: false,
      searchThreshold: 1,
    },
    ...(Object.keys(matchesByStatus).length > 0
      ? [
          {
            type: 'field_value_selection' as const,
            field: 'oauthStatus',
            name: labels.connectors.statusFilter,
            multiSelect: 'or' as const,
            options: Object.keys(matchesByStatus).map((status) => {
              const statusName =
                status === OAUTH_STATUS.AUTHORIZED
                  ? labels.connectors.statusAuthorized
                  : labels.connectors.statusNotAuthorized;
              return {
                value: status,
                name: statusName,
                view: (
                  <FilterOptionWithMatchesBadge
                    name={statusName}
                    matches={matchesByStatus[status] ?? 0}
                  />
                ),
              };
            }),
            autoSortOptions: false,
          },
        ]
      : []),
  ],
});

export interface ConnectorsTableSearch {
  searchConfig: Search;
  results: ConnectorItem[];
}

export const useConnectorsTableSearch = (): ConnectorsTableSearch => {
  const { connectors: readonlyConnectors } = useListConnectors({});
  const connectors = useMemo(() => [...readonlyConnectors], [readonlyConnectors]);
  const {
    services: {
      plugins: { triggersActionsUi },
    },
  } = useKibana();
  const { actionTypeRegistry } = triggersActionsUi;

  const [results, setResults] = useState<ConnectorItem[]>(connectors);
  const currentQueryRef = useRef<Query | null>(null);

  // Re-apply the current search query when connectors data changes (e.g., after create/delete)
  useEffect(() => {
    const filtered = currentQueryRef.current
      ? EuiSearchBar.Query.execute(currentQueryRef.current, connectors, {
          defaultFields: ['name', 'actionTypeId'],
        })
      : connectors;
    setResults(filtered);
  }, [connectors]);

  const handleChange = useCallback(
    ({ query, error: searchError }: EuiSearchBarOnChangeArgs) => {
      if (searchError) {
        return;
      }

      currentQueryRef.current = query ?? null;

      const newItems = query
        ? EuiSearchBar.Query.execute(query, connectors, {
            defaultFields: ['name', 'actionTypeId'],
          })
        : connectors;

      setResults(newItems);
    },
    [connectors]
  );

  const matchesByType = useMemo(() => {
    return countBy(connectors, (c) => c.actionTypeId);
  }, [connectors]);

  const matchesByStatus = useMemo(() => {
    return countBy(
      connectors.filter((c) => c.oauthStatus),
      (c) => c.oauthStatus
    );
  }, [connectors]);

  const searchConfig: Search = useMemo(
    () => ({
      ...getConnectorsTableSearchConfig({ matchesByType, matchesByStatus, actionTypeRegistry }),
      onChange: handleChange,
    }),
    [handleChange, matchesByType, matchesByStatus, actionTypeRegistry]
  );

  return {
    searchConfig,
    results,
  };
};
