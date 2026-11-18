/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { WEB_CRAWLS_PATH } from '../common/constants';
import { ElasticsearchHomePlugin } from './plugin';
import { createWebCrawl } from './test_utils';

const createWorkflowsExtensions = (): jest.Mocked<WorkflowsExtensionsPublicPluginSetup> => ({
  registerStepDefinition: jest.fn(),
  registerTriggerDefinition: jest.fn(),
});

describe('ElasticsearchHomePlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  describe('setup', () => {
    it('sets up without the workflows extensions plugin', () => {
      const plugin = new ElasticsearchHomePlugin();

      expect(() => plugin.setup(coreMock.createSetup(), {})).not.toThrow();
    });

    it('registers the crawl step once when the workflows extensions plugin is available', () => {
      const workflowsExtensions = createWorkflowsExtensions();

      new ElasticsearchHomePlugin().setup(coreMock.createSetup(), { workflowsExtensions });

      expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(1);
      expect(workflowsExtensions.registerTriggerDefinition).not.toHaveBeenCalled();
    });

    it('registers a loader that resolves the crawl step definition', async () => {
      const workflowsExtensions = createWorkflowsExtensions();
      new ElasticsearchHomePlugin().setup(coreMock.createSetup(), { workflowsExtensions });

      const [definitionOrLoader] = workflowsExtensions.registerStepDefinition.mock.calls[0];
      expect(typeof definitionOrLoader).toBe('function');
      const definition = await (typeof definitionOrLoader === 'function'
        ? definitionOrLoader()
        : definitionOrLoader);

      if (!definition) {
        throw new Error('The loader resolved no step definition');
      }
      expect(definition.id).toBe('webCrawl.run');
      expect(definition.label).toBe('Crawl a website');
      expect(definition.icon).toBeDefined();
      expect(definition.inputSchema.safeParse({ url: 'https://example.com' }).success).toBe(true);
      expect(definition.inputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('start', () => {
    const startPlugin = () => {
      const core = coreMock.createStart();
      const plugin = new ElasticsearchHomePlugin();
      plugin.setup(coreMock.createSetup(), {});
      const contract = plugin.start(core, { share: sharePluginMock.createStartContract() });

      return { core, contract };
    };

    it('exposes the home page and the web crawls page', () => {
      const { contract } = startPlugin();

      expect(Object.keys(contract).sort()).toEqual(['HomePage', 'WebCrawlsPage']);
      expect(typeof contract.HomePage).toBe('function');
      expect(typeof contract.WebCrawlsPage).toBe('function');
    });

    it('renders the web crawls page with the services the plugin started with', async () => {
      const {
        core,
        contract: { WebCrawlsPage },
      } = startPlugin();
      core.http.get.mockImplementation(async (path) =>
        String(path) === WEB_CRAWLS_PATH
          ? { crawls: [createWebCrawl({ status: 'completed', url: 'https://example.com' })] }
          : { results: [] }
      );
      const onNavigateHome = jest.fn();

      render(
        <WebCrawlsPage
          telemetryPrefix="testHost-home"
          storageKeyPrefix="testHost.home"
          onNavigateHome={onNavigateHome}
        />
      );

      expect(await screen.findByTestId('elasticsearchHomeWebCrawlsPage')).toBeInTheDocument();
      await waitFor(() => expect(core.http.get).toHaveBeenCalledWith(WEB_CRAWLS_PATH));
      expect(
        await screen.findByRole('link', { name: /https:\/\/example\.com/ })
      ).toBeInTheDocument();
      expect(screen.getByTestId('elasticsearchHomeWebCrawlsBack')).toHaveAttribute(
        'data-telemetry-id',
        'testHost-home-webCrawls-back'
      );
    });
  });
});
