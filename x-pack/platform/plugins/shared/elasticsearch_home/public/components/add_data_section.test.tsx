/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { renderWithHomeContext } from '../test_utils';
import type { HomeAddDataLink } from '../types';
import { AddDataSection } from './add_data_section';

describe('AddDataSection', () => {
  const onEmbeddingsClick = jest.fn();

  const addDataLinks: HomeAddDataLink[] = [
    {
      key: 'embeddings',
      iconType: 'rocket',
      label: 'Generate or store embeddings',
      onClick: onEmbeddingsClick,
      testSubj: 'addDataEmbeddingsLink',
      telemetryId: 'testHost-home-addData-embeddings',
    },
    {
      key: 'devTools',
      iconType: 'code',
      label: 'Query your data in Console',
      onClick: jest.fn(),
      testSubj: 'addDataDevToolsLink',
      telemetryId: 'testHost-home-addData-devTools',
    },
  ];

  const renderSection = () =>
    renderWithHomeContext(<AddDataSection />, { config: { addDataLinks } });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the host-supplied links in order', () => {
    renderSection();

    const links = screen.getAllByRole('listitem');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent('Generate or store embeddings');
    expect(links[1]).toHaveTextContent('Query your data in Console');
  });

  it('invokes the host handler when a link is clicked', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('addDataEmbeddingsLink'));

    expect(onEmbeddingsClick).toHaveBeenCalled();
  });

  it('carries the telemetry id the host supplied', () => {
    renderSection();

    expect(screen.getByTestId('addDataEmbeddingsLink')).toHaveAttribute(
      'data-telemetry-id',
      'testHost-home-addData-embeddings'
    );
  });

  describe('web crawl', () => {
    const renderSectionWithServices = (showWebCrawl?: boolean) => {
      const http = httpServiceMock.createStartContract();
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      renderWithHomeContext(
        <QueryClientProvider client={queryClient}>
          <AddDataSection />
        </QueryClientProvider>,
        {
          services: { http, share: sharePluginMock.createStartContract() },
          config: { addDataLinks, showWebCrawl },
        }
      );

      return http;
    };

    beforeEach(() => {
      window.localStorage.clear();
    });

    it('hides the crawl form by default', () => {
      renderSection();

      expect(screen.queryByTestId('elasticsearchHomeWebCrawl')).not.toBeInTheDocument();
    });

    it('hides the crawl form when the host turns it off', () => {
      renderSectionWithServices(false);

      expect(screen.queryByTestId('elasticsearchHomeWebCrawl')).not.toBeInTheDocument();
    });

    it('shows the crawl form below the links when the host opts in', () => {
      const http = renderSectionWithServices(true);

      expect(screen.getByTestId('elasticsearchHomeWebCrawl')).toBeInTheDocument();
      expect(screen.getByTestId('elasticsearchHomeWebCrawlUrl')).toBeInTheDocument();
      expect(screen.getByTestId('elasticsearchHomeWebCrawlSubmit')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(http.get).not.toHaveBeenCalled();
    });
  });
});
