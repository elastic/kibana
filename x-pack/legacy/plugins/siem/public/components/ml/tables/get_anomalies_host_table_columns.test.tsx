/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAnomaliesHostTableColumnsCurated } from './get_anomalies_host_table_columns';
import { HostsType } from '../../../store/hosts/model';
import * as i18n from './translations';

const startDate = new Date(2001).valueOf();
const endDate = new Date(3000).valueOf();
const interval = 'days';
const narrowDateRange = jest.fn();

describe('get_anomalies_host_table_columns', () => {
  test('on hosts page, we expect to get all columns', () => {
    expect(
      getAnomaliesHostTableColumnsCurated(
        HostsType.page,
        startDate,
        endDate,
        interval,
        narrowDateRange
      ).length
    ).toEqual(6);
  });

  test('on host details page, we expect to remove one columns', () => {
    const columns = getAnomaliesHostTableColumnsCurated(
      HostsType.details,
      startDate,
      endDate,
      interval,
      narrowDateRange
    );
    expect(columns.length).toEqual(5);
  });

  test('on host page, we should have Host Name', () => {
    const columns = getAnomaliesHostTableColumnsCurated(
      HostsType.page,
      startDate,
      endDate,
      interval,
      narrowDateRange
    );
    expect(columns.some(col => col.name === i18n.HOST_NAME)).toEqual(true);
  });

  test('on host details page, we should not have Host Name', () => {
    const columns = getAnomaliesHostTableColumnsCurated(
      HostsType.details,
      startDate,
      endDate,
      interval,
      narrowDateRange
    );
    expect(columns.some(col => col.name === i18n.HOST_NAME)).toEqual(false);
  });
});
