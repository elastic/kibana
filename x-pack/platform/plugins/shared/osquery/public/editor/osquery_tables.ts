/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatMap, isEqual, sortBy } from 'lodash';
import { useMemo, useRef } from 'react';
import type { OsqueryTable } from '../../common/types/schema';
import { useOsquerySchema } from '../common/hooks/use_osquery_schema';
// Static path required by webpack — must match FALLBACK_OSQUERY_VERSION in common/constants.ts
import bundledSchemaJson from '../../common/schemas/osquery/v5.19.0.json';

const normalizeTables = (tablesJSON: OsqueryTable[]) => sortBy(tablesJSON, 'name');

// Sync fallback used while the async API data is loading
let bundledOsqueryTables: OsqueryTable[] | null = null;

const getOsqueryTables = (): OsqueryTable[] => {
  if (!bundledOsqueryTables) {
    bundledOsqueryTables = normalizeTables(bundledSchemaJson as OsqueryTable[]);
  }

  return bundledOsqueryTables;
};

/**
 * React hook that provides osquery tables from the Fleet package (with fallback).
 * Use this in React components instead of the sync getOsqueryTables().
 */
export const useOsqueryTables = () => {
  const { data, isLoading, osqueryVersion } = useOsquerySchema();
  const tablesStableRef = useRef<OsqueryTable[] | null>(null);

  const tables = useMemo(() => {
    const next = data ?? getOsqueryTables();
    if (tablesStableRef.current !== null && isEqual(tablesStableRef.current, next)) {
      return tablesStableRef.current;
    }

    tablesStableRef.current = next;

    return next;
  }, [data]);

  const tablesRecord = useMemo(
    () =>
      Object.fromEntries(tables.map((table) => [table.name, table])) as Record<
        string,
        { columns: Array<{ name: string }> }
      >,
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
