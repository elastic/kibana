/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { LocationProvider } from '../../../../context/LocationContext';
import {
  UrlParamsContext,
  useUiFilters
} from '../../../../context/UrlParamsContext';
import { tick } from '../../../../utils/testHelpers';
import { DatePicker } from '../index';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { history } from '../../../../utils/history';
import { mount } from 'enzyme';
import { EuiSuperDatePicker } from '@elastic/eui';
import { MemoryRouter } from 'react-router-dom';

const mockHistoryPush = jest.spyOn(history, 'push');
const mockRefreshTimeRange = jest.fn();
const MockUrlParamsProvider: React.FC<{
  params?: IUrlParams;
}> = ({ params = {}, children }) => (
  <UrlParamsContext.Provider
    value={{
      urlParams: params,
      refreshTimeRange: mockRefreshTimeRange,
      uiFilters: useUiFilters(params)
    }}
    children={children}
  />
);

function mountDatePicker(params?: IUrlParams) {
  return mount(
    <MemoryRouter initialEntries={[history.location]}>
      <LocationProvider>
        <MockUrlParamsProvider params={params}>
          <DatePicker />
        </MockUrlParamsProvider>
      </LocationProvider>
    </MemoryRouter>
  );
}

describe('DatePicker', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => null);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update the URL when the date range changes', () => {
    const datePicker = mountDatePicker();
    datePicker
      .find(EuiSuperDatePicker)
      .props()
      .onTimeChange({
        start: 'updated-start',
        end: 'updated-end',
        isInvalid: false,
        isQuickSelection: true
      });
    expect(mockHistoryPush).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'rangeFrom=updated-start&rangeTo=updated-end'
      })
    );
  });

  it('should auto-refresh when refreshPaused is false', async () => {
    jest.useFakeTimers();
    const wrapper = mountDatePicker({
      refreshPaused: false,
      refreshInterval: 1000
    });
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    await tick();
    expect(mockRefreshTimeRange).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('should NOT auto-refresh when refreshPaused is true', async () => {
    jest.useFakeTimers();
    mountDatePicker({ refreshPaused: true, refreshInterval: 1000 });
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    await tick();
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
  });
});
