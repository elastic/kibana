/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { PluginStart } from '@kbn/core-di';
import { useService } from '@kbn/core-di-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { runEsqlAsyncSearch } from '@kbn/alerting-v2-episodes-ui/utils/run_esql_async_search';
import { esqlResponseToObjectRows } from '@kbn/alerting-v2-episodes-ui/utils/esql_response_to_rows';
import {
  buildImportAlertCountsQuery,
  toImportAlertCounts,
  type ImportAlertCountRow,
} from '../queries/imports/import_alert_counts_query';
import { importKeys } from './query_key_factory';

/**
 * Loads the alert series count of each import, with one ES|QL query over the alert events of the
 * given connectors. A connector missing from the result has no alerts yet.
 */
export const useFetchImportAlertCounts = (connectorIds: readonly string[]) => {
  const data = useService(PluginStart('data')) as DataPublicPluginStart;

  return useQuery({
    queryKey: importKeys.alertCounts(connectorIds),
    enabled: connectorIds.length > 0,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const response = await runEsqlAsyncSearch({
        data,
        params: { query: buildImportAlertCountsQuery(connectorIds).print('basic') },
        abortSignal: signal,
      });
      return esqlResponseToObjectRows<ImportAlertCountRow>(response);
    },
    select: toImportAlertCounts,
  });
};
