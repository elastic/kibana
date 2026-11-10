/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, type ComposerQuery } from '@elastic/esql';
import { normalizeColumn } from '../../streams/helpers/esql';
import { CONFIG_HASH_FIELD, UNIT_ID_FIELD } from '../constants';

export interface StatsWindow {
  start: string;
  end: string;
}

/** What every stats query for one request shares. The builders add their component ids. */
export interface StatsQueryBaseParams {
  unitId: string;
  window: StatsWindow;
  /** Set only when the request pins a config hash. */
  configHash?: string;
}

/**
 * Keeps the documents of one unit inside the window and, only when the request pins one,
 * of one config hash. Values are inlined as escaped string literals.
 */
export const filterByUnitAndWindow = (
  query: ComposerQuery,
  { unitId, window, configHash }: StatsQueryBaseParams
): ComposerQuery => {
  const inWindow = query.pipe`WHERE ${normalizeColumn(UNIT_ID_FIELD)} == ${unitId}
    AND @timestamp >= ${window.start} AND @timestamp < ${window.end}`;

  return configHash
    ? inWindow.pipe`WHERE ${normalizeColumn(CONFIG_HASH_FIELD)} == ${configHash}`
    : inWindow;
};

/**
 * Makes a column that is not mapped null in the results, not an error. The stream gets its
 * columns from its data, so a metric that has not been seen yet has no column.
 */
export const nullifyUnmappedColumns = (query: ComposerQuery): ComposerQuery =>
  query.addSetCommand('unmapped_fields', 'nullify');

/**
 * Keeps the documents whose `field` is one of `ids`. Only for a non-empty list.
 */
export const filterByIds = (query: ComposerQuery, field: string, ids: string[]): ComposerQuery => {
  const values = ids.map((id) => Builder.expression.literal.string(id));
  const condition = Builder.expression.func.binary('in', [
    normalizeColumn(field),
    Builder.expression.list.tuple({ values }),
  ]);

  return query.pipe`WHERE ${condition}`;
};
