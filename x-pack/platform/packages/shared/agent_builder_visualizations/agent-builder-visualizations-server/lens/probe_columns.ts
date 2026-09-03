/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ProbedColumn {
  name: string;
  type: string;
}

export type ProbeColumnsFn = (query: string) => Promise<ProbedColumn[]>;

export const probeColumns = async (
  query: string,
  getColumns: ProbeColumnsFn
): Promise<ProbedColumn[]> => getColumns(query);
