/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
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

// The execute route answers 200 with `status: 'error'` when the external system rejects
// the call (bad credentials, network); that must read as "no catalog", not "no fields".
const unwrap = <T>(res: ActionTypeExecutorResult<T>): T | undefined => {
  if (res.status === 'error') {
    throw new Error(res.serviceMessage ?? res.message ?? 'The connector returned an error');
  }
  return res.data;
};

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
      const fields = unwrap(await getJiraFields({ http, connectorId, signal }));
      return toCatalog(
        Object.entries(fields ?? {}).map(([key, field]) => ({ key, label: field.name ?? key }))
      );
    }
    case ConnectorTypes.serviceNowITSM:
    case ConnectorTypes.serviceNowSIR: {
      const fields = unwrap(await getServiceNowFields({ http, connectorId, signal }));
      return toCatalog(
        (fields ?? []).map((field) => ({
          key: field.element,
          label: field.column_label || field.element,
        }))
      );
    }
    case ConnectorTypes.resilient: {
      const fields = unwrap(await getResilientFields({ http, connectorId, signal }));
      return toCatalog(
        (fields ?? []).map((field) => ({ key: field.name, label: field.text || field.name }))
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
