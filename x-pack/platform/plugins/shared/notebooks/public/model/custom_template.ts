/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLColumn } from '@kbn/es-types';
import type { Datatable } from '@kbn/expressions-plugin/common';

export interface TemplateData {
  columns: ESQLColumn[];
  rows: unknown[][];
}

/** A cell's table in the column-and-row-array shape custom panel templates are filled from. */
export const toTemplateData = ({ columns, rows }: Datatable): TemplateData => ({
  columns: columns.map(({ name, meta }) => ({ name, type: meta.esType ?? meta.type })),
  rows: rows.map((row) => columns.map(({ id }) => row[id])),
});
