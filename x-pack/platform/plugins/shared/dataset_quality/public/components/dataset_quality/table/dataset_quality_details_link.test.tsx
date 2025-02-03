/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_QUALITY_DETAILS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { BrowserUrlService } from '@kbn/share-plugin/public';
import { shallow } from 'enzyme';
import React from 'react';
import { DatasetQualityDetailsLink } from './dataset_quality_details_link';

const createMockLocator = (id: string) => ({
  navigate: jest.fn(),
  getRedirectUrl: jest.fn().mockReturnValue(id),
});

describe('DatasetQualityDetailsLink', () => {
  const mockDataQualityDetailsLocator = createMockLocator(DATA_QUALITY_DETAILS_LOCATOR_ID);

  const urlServiceMock = {
    locators: {
      get: jest.fn((id) => {
        switch (id) {
          case DATA_QUALITY_DETAILS_LOCATOR_ID:
            return mockDataQualityDetailsLocator;
          default:
            throw new Error(`Unknown locator id: ${id}`);
        }
      }),
    },
  } as any as BrowserUrlService;

  const dataStream = {
    title: 'My data stream',
    rawName: 'logs-my.data.stream-default',
  };

  const timeRange = {
    from: 'now-7d/d',
    refresh: {
      pause: true,
      value: 60000,
    },
    to: 'now',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a link to dataset quality details', () => {
    const wrapper = shallow(
      <DatasetQualityDetailsLink
        urlService={urlServiceMock}
        dataStream={dataStream.rawName}
        timeRange={timeRange}
      >
        {dataStream.title}
      </DatasetQualityDetailsLink>
    );

    expect(mockDataQualityDetailsLocator.getRedirectUrl).toHaveBeenCalledWith({
      dataStream: dataStream.rawName,
      timeRange,
    });
    expect(wrapper.prop('href')).toBe(DATA_QUALITY_DETAILS_LOCATOR_ID);
  });
});
