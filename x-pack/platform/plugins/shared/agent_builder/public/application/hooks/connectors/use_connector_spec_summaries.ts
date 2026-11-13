/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useCallback, useMemo } from 'react';
import { isEarsExperimentalConnector } from '@kbn/connector-specs';
import { queryKeys } from '../../query_keys';
import { useKibana } from '../use_kibana';

const CONNECTOR_SPEC_SUMMARIES_PATH = '/internal/actions/connector_types/specs';

/** One entry of the actions plugin's `GET /internal/actions/connector_types/specs` response. */
export interface ConnectorSpecSummaryItem {
  id: string;
  icon?: string;
  is_ears_experimental: boolean;
}

/**
 * Display data (icon, EARS experimental flag, ...) for spec-backed connector types, served by
 * the actions plugin so types outside the in-tree package are covered too.
 */
export const useConnectorSpecSummaries = (): Map<string, ConnectorSpecSummaryItem> => {
  const {
    services: { http },
  } = useKibana();
  const { data } = useQuery({
    queryKey: queryKeys.connectors.specSummaries,
    queryFn: () => http.get<ConnectorSpecSummaryItem[]>(CONNECTOR_SPEC_SUMMARIES_PATH),
    staleTime: Infinity,
  });
  return useMemo(() => new Map((data ?? []).map((summary) => [summary.id, summary])), [data]);
};

/**
 * Whether a connector type's EARS auth is experimental. The in-tree answer wins; the actions
 * plugin only adds types the package does not know about.
 */
export const useIsEarsExperimentalConnector = (): ((actionTypeId: string) => boolean) => {
  const summaries = useConnectorSpecSummaries();
  return useCallback(
    (actionTypeId: string) =>
      isEarsExperimentalConnector(actionTypeId) ||
      summaries.get(actionTypeId)?.is_ears_experimental === true,
    [summaries]
  );
};
