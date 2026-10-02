/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import { ConnectorTypes } from '../../../common/types/domain';
import { useApplicationCapabilities, useKibana } from '../../common/lib/kibana';
import { casesQueriesKeys } from '../../containers/constants';
import { getFields as getJiraFields } from '../connectors/jira/api';
import { getFields as getResilientFields } from '../connectors/resilient/api';
import { getFields as getServiceNowFields } from '../connectors/servicenow/api';

export interface ExternalFieldCatalogEntry {
  key: string;
  label: string;
}

export type ExternalFieldCatalog = Map<string, ExternalFieldCatalogEntry>;

const CATALOG_CONNECTOR_TYPES: ReadonlySet<string> = new Set([
  ConnectorTypes.jira,
  ConnectorTypes.serviceNowITSM,
  ConnectorTypes.serviceNowSIR,
  ConnectorTypes.resilient,
]);

export const hasExternalFieldCatalog = (connectorType: string): boolean =>
  CATALOG_CONNECTOR_TYPES.has(connectorType);

const toCatalog = (entries: ExternalFieldCatalogEntry[]): ExternalFieldCatalog =>
  new Map(entries.map((entry) => [entry.key, entry]));

const fetchCatalog = async ({
  http,
  connectorId,
  connectorType,
  signal,
}: {
  http: HttpSetup;
  connectorId: string;
  connectorType: string;
  signal?: AbortSignal;
}): Promise<ExternalFieldCatalog> => {
  switch (connectorType) {
    case ConnectorTypes.jira: {
      const res = await getJiraFields({ http, connectorId, signal });
      return toCatalog(
        Object.entries(res.data ?? {}).map(([key, field]) => ({ key, label: field.name ?? key }))
      );
    }
    case ConnectorTypes.serviceNowITSM:
    case ConnectorTypes.serviceNowSIR: {
      const res = await getServiceNowFields({ http, connectorId, signal });
      return toCatalog(
        (res.data ?? []).map((field) => ({
          key: field.element,
          label: field.column_label || field.element,
        }))
      );
    }
    case ConnectorTypes.resilient: {
      const res = await getResilientFields({ http, connectorId, signal });
      return toCatalog(
        (res.data ?? []).map((field) => ({ key: field.name, label: field.text || field.name }))
      );
    }
    default:
      return new Map();
  }
};

/**
 * Field names and labels as the external system reports them. Decorative: callers must
 * render without it, so failures are not surfaced as toasts.
 */
export const useGetExternalFieldCatalog = ({
  connectorId,
  connectorType,
}: {
  connectorId: string;
  connectorType: string;
}) => {
  const { http } = useKibana().services;
  const { actions } = useApplicationCapabilities();

  return useQuery<ExternalFieldCatalog>(
    casesQueriesKeys.externalFieldCatalog(connectorId),
    ({ signal }) => fetchCatalog({ http, connectorId, connectorType, signal }),
    {
      enabled: actions.read && hasExternalFieldCatalog(connectorType),
      staleTime: 5 * 60 * 1000,
      retry: false,
    }
  );
};
