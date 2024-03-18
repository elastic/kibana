/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ToastsStart, HttpStart } from '@kbn/core/public';

import { setFullTimeRange } from './full_time_range_selector_service';

jest.mock('./time_field_range');

import { getTimeFieldRange } from './time_field_range';

const mockParamsFactory = () => ({
  timefilter: { setTime: jest.fn() } as unknown as TimefilterContract,
  dataView: { getIndexPattern: jest.fn(), getRuntimeMappings: jest.fn() } as unknown as DataView,
  toasts: {
    addWarning: jest.fn(),
    addDanger: jest.fn(),
    addError: jest.fn(),
  } as unknown as ToastsStart,
});

describe('setFullTimeRange', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the full time range based off the file upload endpoint format', async () => {
    // prepare
    const { timefilter, dataView, toasts } = mockParamsFactory();
    (getTimeFieldRange as jest.MockedFunction<any>).mockImplementationOnce(async () => ({
      success: true,
      start: { epoch: 1234, string: moment(1234).toISOString() },
      end: { epoch: 2345, string: moment(2345).toISOString() },
    }));

    // act
    const fullTimeRange = await setFullTimeRange(timefilter, dataView, toasts, {} as HttpStart);

    // assert
    expect(getTimeFieldRange).toHaveBeenCalledTimes(1);
    expect(fullTimeRange).toStrictEqual({
      success: true,
      start: { epoch: 1234, string: '1970-01-01T00:00:01.234Z' },
      end: { epoch: 2345, string: '1970-01-01T00:00:02.345Z' },
    });
  });

  it('returns the full time range based off the ml endpoint format', async () => {
    // prepare
    const { timefilter, dataView, toasts } = mockParamsFactory();
    (getTimeFieldRange as jest.MockedFunction<any>).mockImplementationOnce(async () => ({
      success: true,
      start: 1234,
      end: 2345,
    }));

    // act
    const fullTimeRange = await setFullTimeRange(timefilter, dataView, toasts, {} as HttpStart);

    // assert
    expect(getTimeFieldRange).toHaveBeenCalledTimes(1);
    expect(fullTimeRange).toStrictEqual({
      success: true,
      start: { epoch: 1234, string: '1970-01-01T00:00:01.234Z' },
      end: { epoch: 2345, string: '1970-01-01T00:00:02.345Z' },
    });
  });

  it('returns undefined based off the file upload endpoint format', async () => {
    // prepare
    const { timefilter, dataView, toasts } = mockParamsFactory();
    (getTimeFieldRange as jest.MockedFunction<any>).mockImplementationOnce(async () => ({
      success: true,
      start: { epoch: null, string: moment(null).toISOString() },
      end: { epoch: null, string: moment(null).toISOString() },
    }));

    // act
    const fullTimeRange = await setFullTimeRange(timefilter, dataView, toasts, {} as HttpStart);

    // assert
    expect(getTimeFieldRange).toHaveBeenCalledTimes(1);
    expect(fullTimeRange).toStrictEqual(undefined);
  });

  it('returns undefined based off the ml endpoint format', async () => {
    // prepare
    const { timefilter, dataView, toasts } = mockParamsFactory();
    (getTimeFieldRange as jest.MockedFunction<any>).mockImplementationOnce(async () => ({
      success: true,
      start: null,
      end: null,
    }));

    // act
    const fullTimeRange = await setFullTimeRange(timefilter, dataView, toasts, {} as HttpStart);

    // assert
    expect(getTimeFieldRange).toHaveBeenCalledTimes(1);
    expect(fullTimeRange).toStrictEqual(undefined);
  });
});
