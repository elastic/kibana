/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldStatsInitializerViewType } from '../../../../../common/embeddables/types';
import {
  fieldStatsSkipsDataFetch,
  isUnsupportedFieldStatsEsqlQuery,
} from './field_stats_skips_data_fetch';

describe('fieldStatsSkipsDataFetch', () => {
  it('skips fetching for ES|QL queries because field statistics are not supported', () => {
    expect(isUnsupportedFieldStatsEsqlQuery({ esql: 'FROM logs-* | LIMIT 10' })).toBe(true);
    expect(
      fieldStatsSkipsDataFetch({
        viewType: FieldStatsInitializerViewType.ESQL,
        isEsqlEnabled: true,
        query: { esql: 'FROM logs-* | LIMIT 10' },
        hasDataView: true,
      })
    ).toBe(true);
  });

  it('skips fetching when ES|QL is disabled or no data view is selected', () => {
    expect(
      fieldStatsSkipsDataFetch({
        viewType: FieldStatsInitializerViewType.ESQL,
        isEsqlEnabled: false,
        query: undefined,
        hasDataView: false,
      })
    ).toBe(true);
    expect(
      fieldStatsSkipsDataFetch({
        viewType: FieldStatsInitializerViewType.DATA_VIEW,
        isEsqlEnabled: true,
        query: undefined,
        hasDataView: false,
      })
    ).toBe(true);
  });

  it('fetches when a data view is selected', () => {
    expect(
      fieldStatsSkipsDataFetch({
        viewType: FieldStatsInitializerViewType.DATA_VIEW,
        isEsqlEnabled: true,
        query: undefined,
        hasDataView: true,
      })
    ).toBe(false);
  });
});
