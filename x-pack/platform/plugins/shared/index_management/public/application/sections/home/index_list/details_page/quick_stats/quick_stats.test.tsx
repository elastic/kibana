/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import type { IndexOverviewCard } from '@kbn/index-management-shared-types';
import { QuickStats } from './quick_stats';
import { useAppContext } from '../../../../../app_context';
import { loadIndexVectorCount } from '../../../../../services/api';

jest.mock('../../../../../app_context', () => ({
  useAppContext: jest.fn(),
}));

jest.mock('../../../../../services/api', () => ({
  loadIndexDocCount: jest.fn().mockResolvedValue({ data: { 'test-index': 0 } }),
  loadIndexVectorCount: jest.fn().mockResolvedValue({ data: { vectorCount: 5 } }),
}));

jest.mock('./storage_details', () => ({ StorageDetails: () => null }));
jest.mock('./status_details', () => ({ StatusDetails: () => null }));
jest.mock('./size_doc_count_details', () => ({ SizeDocCountDetails: () => null }));
jest.mock('./aliases_details', () => ({ AliasesDetails: () => null }));
jest.mock('./data_stream_details', () => ({ DataStreamDetails: () => null }));

const mockUseAppContext = jest.mocked(useAppContext);
const mockLoadIndexVectorCount = jest.mocked(loadIndexVectorCount);

describe('QuickStats', () => {
  const createAppContext = ({
    enableVectorCount = true,
    indexOverviewCards = [],
  }: {
    enableVectorCount?: boolean;
    indexOverviewCards?: IndexOverviewCard[];
  } = {}) =>
    ({
      config: { enableSizeAndDocCount: true, enableVectorCount },
      core: { getUrlForApp: (appId: string) => `/app/${appId}` },
      services: { extensionsService: { indexOverviewCards } },
    } as unknown as ReturnType<typeof useAppContext>);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppContext.mockReturnValue(createAppContext());
  });

  it('does not call loadIndexVectorCount when enableVectorCount is disabled', async () => {
    mockUseAppContext.mockReturnValue(createAppContext({ enableVectorCount: false }));

    await act(async () => {
      render(<QuickStats indexDetails={{ name: 'test-index' }} />);
    });

    expect(mockLoadIndexVectorCount).not.toHaveBeenCalled();
  });

  it('shows the cards that other plugins add, with their title, content, and footer', async () => {
    mockUseAppContext.mockReturnValue(
      createAppContext({
        indexOverviewCards: [
          {
            id: 'test',
            title: 'Test card',
            renderCard: ({ index, getUrlForApp }) => ({
              content: { left: index.name, right: <a href={getUrlForApp('test')}>Open</a> },
              footer: { left: 'Test footer' },
            }),
          },
        ],
      })
    );

    await act(async () => {
      render(<QuickStats indexDetails={{ name: 'test-index' }} />);
    });

    const card = screen.getByTestId('indexDetailsOverviewCard-test');
    expect(card).toHaveTextContent('Test card');
    expect(card).toHaveTextContent('test-index');
    expect(within(card).getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/app/test');
    expect(card).toHaveTextContent('Test footer');
  });

  it("leaves out a card that another plugin doesn't show for the index", async () => {
    mockUseAppContext.mockReturnValue(
      createAppContext({
        indexOverviewCards: [
          {
            id: 'test',
            title: 'Test card',
            shouldRenderCard: ({ index }) => index.name !== 'test-index',
            renderCard: () => ({ content: { left: 'Test content' } }),
          },
        ],
      })
    );

    await act(async () => {
      render(<QuickStats indexDetails={{ name: 'test-index' }} />);
    });

    expect(screen.queryByTestId('indexDetailsOverviewCard-test')).not.toBeInTheDocument();
  });
});
