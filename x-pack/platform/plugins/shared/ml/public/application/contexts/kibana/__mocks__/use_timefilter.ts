/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { TimefilterContract } from '@kbn/data-plugin/public';

vi.mock('./kibana_context');

export const timefilterMock = dataPluginMock.createStartContract().query.timefilter
  .timefilter as Mocked<TimefilterContract>;

export const createTimefilterMock = () => {
  return dataPluginMock.createStartContract().query.timefilter
    .timefilter as Mocked<TimefilterContract>;
};

export const useTimefilter = vi.fn(() => {
  return timefilterMock;
});

export const useRefreshIntervalUpdates = vi.fn(() => {
  return {
    pause: false,
    value: 0,
  };
});

export const useTimeRangeUpdates = vi.fn(() => {
  return {
    from: '',
    to: '',
  };
});
