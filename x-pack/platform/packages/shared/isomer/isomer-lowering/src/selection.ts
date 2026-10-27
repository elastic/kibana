/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Alembic's cross-filter selection (`alembic-poc` `packages/selection`), which the ES|QL and DSL helpers read.

export interface SelectionPredicate {
  field: string;
  value?: string | number | boolean;
  range?: { gte: number | string; lt: number | string };
}

export interface ChartSelection {
  /** The dashboard panel's id, not its index. */
  panelId: string;
  /** ANDed. */
  predicates: SelectionPredicate[];
}
