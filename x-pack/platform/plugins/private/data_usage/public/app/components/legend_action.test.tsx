/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DATA_QUALITY_DETAILS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { LegendAction } from './legend_action';

const mockNavigate = jest.fn();
const mockGetLocator = jest.fn((_id: string) => ({ navigate: mockNavigate }));

jest.mock('../../utils/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      share: { url: { locators: { get: mockGetLocator } } },
      application: { capabilities: { index_management: {}, data_quality: {} } },
    },
  }),
}));

jest.mock('../hooks/use_date_picker', () => ({
  useDateRangePicker: () => ({
    dateRangePickerState: { startDate: 'now-24h', endDate: 'now' },
  }),
}));

const dataStreamName = 'logs-nginx.access-default';

describe('LegendAction', () => {
  const togglePopover = jest.fn();
  const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  afterEach(() => {
    if (clipboard) {
      Object.defineProperty(navigator, 'clipboard', clipboard);
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    render(
      <LegendAction
        idx={0}
        label={dataStreamName}
        popoverOpen={`0-${dataStreamName}`}
        togglePopover={togglePopover}
      />
    );
  });

  it('copies the data stream name', async () => {
    const writeText = jest.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await userEvent.click(screen.getByTestId('copyDataStreamNameAction'));

    expect(writeText).toHaveBeenCalledWith(dataStreamName);
    expect(togglePopover).toHaveBeenCalledWith(null);
  });

  it('navigates to the data stream in Index Management', async () => {
    await userEvent.click(screen.getByTestId('manageDataStreamAction'));

    expect(mockGetLocator).toHaveBeenCalledWith('INDEX_MANAGEMENT_LOCATOR_ID');
    expect(mockNavigate).toHaveBeenCalledWith({
      page: 'data_streams_details',
      dataStreamName,
    });
    expect(togglePopover).toHaveBeenCalledWith(null);
  });

  it('navigates to the data set quality details', async () => {
    await userEvent.click(screen.getByTestId('DatasetQualityAction'));

    expect(mockGetLocator).toHaveBeenCalledWith(DATA_QUALITY_DETAILS_LOCATOR_ID);
    expect(mockNavigate).toHaveBeenCalledWith({
      dataStream: dataStreamName,
      timeRange: { from: 'now-24h', to: 'now', refresh: { pause: true, value: 0 } },
    });
  });
});
