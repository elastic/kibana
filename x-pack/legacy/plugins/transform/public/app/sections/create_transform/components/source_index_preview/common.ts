/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PivotQuery } from '../../../../common';

export const getSourceIndexDevConsoleStatement = (query: PivotQuery, indexPatternTitle: string) => {
  return `GET ${indexPatternTitle}/_search\n${JSON.stringify(
    {
      query,
    },
    null,
    2
  )}\n`;
};
