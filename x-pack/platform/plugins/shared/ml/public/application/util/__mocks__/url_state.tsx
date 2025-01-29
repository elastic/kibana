/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TABLE_INTERVAL_DEFAULT } from '../../components/controls/select_interval/select_interval';

export const useUrlState = jest.fn((accessor: '_a' | '_g') => {
  if (accessor === '_g') {
    return [{ refreshInterval: { value: 0, pause: true } }, jest.fn()];
  }
});

export const usePageUrlState = jest.fn((pageKey: string) => {
  let state: unknown;
  switch (pageKey) {
    case 'timeseriesexplorer':
      state = {};
      break;
    case 'mlSelectInterval':
      state = TABLE_INTERVAL_DEFAULT;
      break;
  }
  return [state, jest.fn()];
});
