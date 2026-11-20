/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import type { WebCrawlPanelProps } from '@kbn/web-crawler-plugin/public';
import { renderWithHomeContext, testConfig } from '../test_utils';
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
    const WebCrawlPanel = jest.fn((_props: WebCrawlPanelProps) => (
      <div data-test-subj="webCrawlPanel" />
    ));
    const webCrawler = { WebCrawlPanel, WebCrawlsPage: () => null };

    beforeEach(() => {
      WebCrawlPanel.mockClear();
    });

    it('hides the crawl form by default', () => {
      renderWithHomeContext(<AddDataSection />, {
        services: { webCrawler },
        config: { addDataLinks },
      });

      expect(screen.queryByTestId('webCrawlPanel')).not.toBeInTheDocument();
    });

    it('hides the crawl form when the web crawler plugin is unavailable', () => {
      renderWithHomeContext(<AddDataSection />, {
        config: { addDataLinks, showWebCrawl: true },
      });

      expect(screen.queryByTestId('webCrawlPanel')).not.toBeInTheDocument();
    });

    it("shows the crawl form under the host's namespaces when the host opts in", () => {
      const onManageWebCrawls = jest.fn();
      renderWithHomeContext(<AddDataSection />, {
        services: { webCrawler },
        config: { addDataLinks, showWebCrawl: true, onManageWebCrawls },
      });

      expect(screen.getByTestId('webCrawlPanel')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      const [[props]] = WebCrawlPanel.mock.calls;
      expect(props).toEqual({
        telemetryPrefix: testConfig.telemetryPrefix,
        storageKeyPrefix: testConfig.storageKeyPrefix,
        onManageWebCrawls,
      });
    });
  });
});
