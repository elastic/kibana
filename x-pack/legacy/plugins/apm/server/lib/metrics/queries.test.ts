/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCPUChartData } from './by_agent/shared/cpu';
import { getMemoryChartData } from './by_agent/shared/memory';
import { getHeapMemoryChart } from './by_agent/java/heap_memory';
import { getNonHeapMemoryChart } from './by_agent/java/non_heap_memory';
import { getThreadCountChart } from './by_agent/java/thread_count';
import {
  SearchParamsMock,
  inspectSearchParams
} from '../../../public/utils/testHelpers';

describe('metrics queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches cpu chart data', async () => {
    mock = await inspectSearchParams(setup => getCPUChartData(setup, 'foo'));

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches memory chart data', async () => {
    mock = await inspectSearchParams(setup => getMemoryChartData(setup, 'foo'));

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches heap memory chart data', async () => {
    mock = await inspectSearchParams(setup => getHeapMemoryChart(setup, 'foo'));

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches non heap memory chart data', async () => {
    mock = await inspectSearchParams(setup =>
      getNonHeapMemoryChart(setup, 'foo')
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches thread count chart data', async () => {
    mock = await inspectSearchParams(setup =>
      getThreadCountChart(setup, 'foo')
    );

    expect(mock.params).toMatchSnapshot();
  });
});
