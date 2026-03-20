/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatMap, sortBy } from 'lodash';
import { useMemo } from 'react';
import type { OsqueryTable } from '../../common/types/schema';
import { useOsquerySchema } from '../common/hooks/use_osquery_schema';

type TablesJSON = Array<{
  name: string;
}>;
const normalizeTables = (tablesJSON: TablesJSON) => sortBy(tablesJSON, 'name');

// Sync fallback used while the async API data is loading
let osqueryTables: TablesJSON | null = null;

const getOsqueryTables = () => {
  if (!osqueryTables) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    osqueryTables = normalizeTables(require('../common/schemas/osquery/v5.19.0.json'));
  }

  return osqueryTables;
};

/**
 * React hook that provides osquery tables from the Fleet package (with fallback).
 * Use this in React components instead of the sync getOsqueryTables().
 */
export const useOsqueryTables = () => {
  const { data, isLoading, osqueryVersion } = useOsquerySchema();

  const tables = useMemo(() => data ?? getOsqueryTables(), [data]);

  const tablesRecord = useMemo(
    () =>
      (tables as OsqueryTable[]).reduce<
        Record<string, { columns: Array<{ name: string }> }>
      >(
        (acc, table) => ({
          ...acc,
          [table.name]: table,
        }),
        {}
      ),
    [tables]
  );

  const tableNames = useMemo(() => flatMap(tables, 'name'), [tables]);

  return {
    tables,
    tablesRecord,
    tableNames,
    isLoading,
    osqueryVersion,
  };
};
