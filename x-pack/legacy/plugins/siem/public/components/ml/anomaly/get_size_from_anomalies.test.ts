/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import { getSizeFromAnomalies } from './get_size_from_anomalies';
import { mockAnomalies } from '../mock';

describe('get_size_from_anomalies', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('returns 0 if anomalies is null', () => {
    const size = getSizeFromAnomalies(null);
    expect(size).toEqual(0);
  });

  test('returns anomalies length', () => {
    const size = getSizeFromAnomalies(anomalies);
    expect(size).toEqual(2);
  });
});
