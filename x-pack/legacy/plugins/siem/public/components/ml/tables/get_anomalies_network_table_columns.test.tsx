/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAnomaliesNetworkTableColumnsCurated } from './get_anomalies_network_table_columns';
import { NetworkType } from '../../../store/network/model';
import * as i18n from './translations';

const startDate = new Date(2001).valueOf();
const endDate = new Date(3000).valueOf();
const interval = 'days';
const narrowDateRange = jest.fn();

describe('get_anomalies_network_table_columns', () => {
  test('on network page, we expect to get all columns', () => {
    expect(
      getAnomaliesNetworkTableColumnsCurated(
        NetworkType.page,
        startDate,
        endDate,
        interval,
        narrowDateRange
      ).length
    ).toEqual(6);
  });

  test('on network details page, we expect to remove one columns', () => {
    const columns = getAnomaliesNetworkTableColumnsCurated(
      NetworkType.details,
      startDate,
      endDate,
      interval,
      narrowDateRange
    );
    expect(columns.length).toEqual(5);
  });

  test('on network page, we should have Network Name', () => {
    const columns = getAnomaliesNetworkTableColumnsCurated(
      NetworkType.page,
      startDate,
      endDate,
      interval,
      narrowDateRange
    );
    expect(columns.some(col => col.name === i18n.NETWORK_NAME)).toEqual(true);
  });

  test('on network details page, we should not have Network Name', () => {
    const columns = getAnomaliesNetworkTableColumnsCurated(
      NetworkType.details,
      startDate,
      endDate,
      interval,
      narrowDateRange
    );
    expect(columns.some(col => col.name === i18n.NETWORK_NAME)).toEqual(false);
  });
});
