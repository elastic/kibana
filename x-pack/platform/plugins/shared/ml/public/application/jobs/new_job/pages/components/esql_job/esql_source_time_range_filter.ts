/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateBounds } from '@kbn/data-plugin/common';

export interface EsqlSourceTimeRangeFilterOptions {
  /** The raw `source_time_field` the datafeed bounds its source by. */
  sourceTimeField: string;
  /** Wizard range start; absolute or datemath (`now-15m`). */
  from: string;
  /** Wizard range end; absolute or datemath (`now`). */
  to: string;
}

/**
 * Resolves the wizard's (possibly relative) range against the current clock and
 * returns the DSL `filter` passed to `getESQLResults` so only source rows whose
 * raw `source_time_field` lies inside the range are queried. Shared by the
 * step-1 output preview and the row-count histogram so both always see the same
 * rows (g2sz.28). Returns `undefined` (no restriction) when no source time
 * field is set or the range cannot be resolved.
 */
export const buildEsqlSourceTimeRangeFilter = ({
  sourceTimeField,
  from,
  to,
}: EsqlSourceTimeRangeFilterOptions) => {
  const bounds = calculateBounds({ from, to });

  if (sourceTimeField.trim() === '' || !bounds.min || !bounds.max) return undefined;

  return {
    bool: {
      filter: [
        {
          range: {
            [sourceTimeField]: {
              gte: bounds.min.toISOString(),
              lte: bounds.max.toISOString(),
              format: 'strict_date_optional_time',
            },
          },
        },
      ],
    },
  };
};
