/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';

/**
 * Converts a list of paginated rows into a flat list of `DataTableRecord`s.
 */
export const pagesToDatatableRecords = (pages?: Datatable[]) => {
  return (
    pages
      ?.flatMap((page) => page.rows)
      .map((row, idx) => {
        const record: DataTableRecord = {
          id: String(idx),
          raw: row,
          flattened: row,
        };

        return record;
      }) ?? []
  );
};
