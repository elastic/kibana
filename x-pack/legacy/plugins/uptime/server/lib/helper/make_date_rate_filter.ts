/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const makeDateRangeFilter = (
  dateRangeStart: string | number,
  dateRangeEnd: string | number,
  filterTimespan: boolean,
) => {
  const timestampClause = {
    range: {'@timestamp': {gte: dateRangeStart, lte: dateRangeEnd}},
  };

  if (true || !filterTimespan) {
    return timestampClause;
  }

  return {
    bool: {
      filter: [
        timestampClause,
        {
          bool: {
            should: [
              {
                range: {
                  "monitor.timespan": {
                    "gte": `${dateRangeEnd}-10s`,
                    "lte": dateRangeEnd,
                  }
                }
              },
              {
                bool: {
                  must_not: { exists: { field: "monitor.timespan" } }
                }
              }
            ]
          },
        }
      ]
    }
  };
}
