/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { sharePluginMock } from '@kbn/share-plugin/public/mocks';

import { IndexItem } from './index_item';
import type { InferenceUsageInfo } from '../../../../types';
import { useKibana } from '../../../../../../hooks/use_kibana';

jest.mock('../../../../../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.Mock;
const locatorMock = sharePluginMock.createLocator();
let mockLocatorGet: jest.Mock;

describe('Index Item', () => {
  const item: InferenceUsageInfo = {
    id: 'index-1',
    type: 'Index',
  };
  beforeEach(() => {
    jest.resetAllMocks();
    locatorMock.getUrl.mockResolvedValue('https://locator.url');
    mockLocatorGet = jest.fn().mockReturnValue(locatorMock);
    mockUseKibana.mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: mockLocatorGet,
            },
          },
        },
      },
    });
    jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<IndexItem usageItem={item} />);
  });

  it('renders', () => {
    expect(screen.getByText('index-1')).toBeInTheDocument();
    expect(screen.getByText('Index')).toBeInTheDocument();
  });

  it('opens index in a new tab', async () => {
    fireEvent.click(screen.getByRole('button'));

    expect(mockLocatorGet).toHaveBeenCalledWith('SEARCH_INDEX_MANAGEMENT_LOCATOR_ID');
    await waitFor(() => {
      expect(locatorMock.getUrl).toHaveBeenCalledWith({
        page: 'index_details',
        indexName: 'index-1',
      });
    });
    expect(window.open).toHaveBeenCalledWith('https://locator.url', '_blank');
  });
});
