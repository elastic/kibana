/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { WebCrawlScheduleRequest } from '../../common/types';
import { buildWebCrawlWorkflowYaml } from '../../common/web_crawl_schedule';
import { createHttpError, createTestQueryClient, webCrawlerContextWrapper } from '../test_utils';
import { useWebCrawlSchedules } from './use_web_crawl_schedules';

const WORKFLOWS_PATH = '/api/workflows';
const WORKFLOW_PATH = '/api/workflows/workflow';
const API_VERSION = '2023-10-31';

const scheduleRequest: WebCrawlScheduleRequest = {
  url: 'https://example.com',
  maxDepth: 3,
  maxDocuments: 250,
  every: 2,
  unit: 'h',
};

const workflows = [
  { id: 'workflow-1', name: 'Web crawl: https://example.com', enabled: true, tags: ['web-crawl'] },
  { id: 'workflow-2', name: 'Web crawl: https://elastic.co', enabled: false, tags: ['web-crawl'] },
];

interface RenderOptions {
  capabilities?: Record<string, boolean>;
  hasWorkflowsApp?: boolean;
}

describe('useWebCrawlSchedules', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let application: ReturnType<typeof applicationServiceMock.createStartContract>;

  const renderSchedules = ({
    capabilities = { readWorkflow: true, createWorkflow: true },
    hasWorkflowsApp = true,
  }: RenderOptions = {}) => {
    application.capabilities = { ...application.capabilities, workflowsManagement: capabilities };
    const chrome = chromeServiceMock.createStartContract();
    chrome.navLinks.has.mockImplementation((id: string) => hasWorkflowsApp && id === 'workflows');

    const queryClient = createTestQueryClient();
    const WebCrawlerContext = webCrawlerContextWrapper({ services: { http, application, chrome } });

    return renderHook(() => useWebCrawlSchedules(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>
          <WebCrawlerContext>{children}</WebCrawlerContext>
        </QueryClientProvider>
      ),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue({ results: workflows });
    application = applicationServiceMock.createStartContract();
    application.getUrlForApp.mockImplementation(
      (appId, options) => `/app/${appId}${options?.path ?? ''}`
    );
  });

  describe('privileges', () => {
    it('can read and create with both privileges and the Workflows app', async () => {
      const { result } = renderSchedules();

      expect(result.current.canRead).toBe(true);
      expect(result.current.canCreate).toBe(true);
      await waitFor(() => expect(result.current.schedules).toHaveLength(2));
    });

    it('can only read without the create privilege', async () => {
      const { result } = renderSchedules({ capabilities: { readWorkflow: true } });

      expect(result.current.canRead).toBe(true);
      expect(result.current.canCreate).toBe(false);
      await waitFor(() => expect(result.current.schedules).toHaveLength(2));
    });

    it.each<[string, RenderOptions]>([
      ['the read privilege is missing', { capabilities: { createWorkflow: true } }],
      ['the read privilege is denied', { capabilities: { readWorkflow: false } }],
      ['the Workflows app is unavailable', { hasWorkflowsApp: false }],
    ])('cannot read or create, and requests nothing, when %s', async (_, options) => {
      const { result } = renderSchedules(options);

      expect(result.current.canRead).toBe(false);
      expect(result.current.canCreate).toBe(false);
      expect(result.current.schedules).toEqual([]);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(http.get).not.toHaveBeenCalled();
    });

    it('cannot read or create when the Workflows feature registered no capabilities', () => {
      application.capabilities = { ...application.capabilities };
      const chrome = chromeServiceMock.createStartContract();
      chrome.navLinks.has.mockReturnValue(true);
      const WebCrawlerContext = webCrawlerContextWrapper({
        services: { http, application, chrome },
      });
      const queryClient = createTestQueryClient();

      const { result } = renderHook(() => useWebCrawlSchedules(), {
        wrapper: ({ children }: PropsWithChildren) => (
          <QueryClientProvider client={queryClient}>
            <WebCrawlerContext>{children}</WebCrawlerContext>
          </QueryClientProvider>
        ),
      });

      expect(result.current.canRead).toBe(false);
      expect(result.current.canCreate).toBe(false);
      expect(http.get).not.toHaveBeenCalled();
    });
  });

  describe('listing', () => {
    it('lists the workflows tagged as web crawls', async () => {
      const { result } = renderSchedules();

      await waitFor(() =>
        expect(result.current.schedules).toEqual([
          { workflowId: 'workflow-1', name: 'Web crawl: https://example.com', enabled: true },
          { workflowId: 'workflow-2', name: 'Web crawl: https://elastic.co', enabled: false },
        ])
      );
      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(WORKFLOWS_PATH, {
        query: { tags: 'web-crawl', size: 100 },
        version: API_VERSION,
      });
    });

    it('has no schedules when the list cannot be loaded', async () => {
      http.get.mockRejectedValue(createHttpError('Forbidden', 403));

      const { result } = renderSchedules();

      await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));
      expect(result.current.schedules).toEqual([]);
      expect(result.current.createErrorMessage).toBeUndefined();
    });
  });

  describe('creating', () => {
    it('creates a workflow from the generated YAML and refreshes the list', async () => {
      const { result } = renderSchedules();
      await waitFor(() => expect(result.current.schedules).toHaveLength(2));
      const created = { id: 'workflow-3', name: 'Web crawl: https://example.com', enabled: true };
      http.post.mockResolvedValue(created);
      http.get.mockResolvedValue({ results: [...workflows, created] });
      const onSuccess = jest.fn();

      act(() => {
        result.current.createSchedule(scheduleRequest, { onSuccess });
      });

      await waitFor(() => expect(result.current.schedules).toHaveLength(3));
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WORKFLOW_PATH, {
        body: JSON.stringify({ yaml: buildWebCrawlWorkflowYaml(scheduleRequest) }),
        version: API_VERSION,
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledTimes(2);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.createErrorMessage).toBeUndefined();
    });

    it('sends a workflow that repeats the crawl on the requested interval', async () => {
      const { result } = renderSchedules();
      http.post.mockResolvedValue({ id: 'workflow-3', name: 'n', enabled: true });

      act(() => {
        result.current.createSchedule(scheduleRequest);
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      for (const fragment of [
        'https://example.com',
        '2h',
        'web-crawl',
        'webCrawl.run',
        'max_depth: 3',
        'max_documents: 250',
      ]) {
        expect(http.post).toHaveBeenCalledWith(
          WORKFLOW_PATH,
          expect.objectContaining({ body: expect.stringContaining(fragment) })
        );
      }
    });

    const expectPostedBody = (body: string) =>
      expect(http.post).toHaveBeenCalledWith(WORKFLOW_PATH, expect.objectContaining({ body }));

    it('sends a workflow without path rules when the request has none', async () => {
      const { result } = renderSchedules();
      http.post.mockResolvedValue({ id: 'workflow-3', name: 'n', enabled: true });

      act(() => {
        result.current.createSchedule(scheduleRequest);
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expectPostedBody(expect.not.stringContaining('include_paths'));
      expectPostedBody(expect.not.stringContaining('exclude_paths'));
    });

    it('sends a workflow without path rules when the request has empty ones', async () => {
      const { result } = renderSchedules();
      http.post.mockResolvedValue({ id: 'workflow-3', name: 'n', enabled: true });

      act(() => {
        result.current.createSchedule({ ...scheduleRequest, includePaths: [], excludePaths: [] });
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expectPostedBody(JSON.stringify({ yaml: buildWebCrawlWorkflowYaml(scheduleRequest) }));
    });

    it('sends a workflow that crawls with the path rules of the request', async () => {
      const { result } = renderSchedules();
      http.post.mockResolvedValue({ id: 'workflow-3', name: 'n', enabled: true });
      const request: WebCrawlScheduleRequest = {
        ...scheduleRequest,
        includePaths: ['/docs', '/blog'],
        excludePaths: ['/docs/archive'],
      };

      act(() => {
        result.current.createSchedule(request);
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WORKFLOW_PATH, {
        body: JSON.stringify({ yaml: buildWebCrawlWorkflowYaml(request) }),
        version: API_VERSION,
      });
      const yaml = buildWebCrawlWorkflowYaml(request);
      expect(yaml).toMatch(/include_paths:\s*\n\s*- \/docs\s*\n\s*- \/blog\s*\n/);
      expect(yaml).toMatch(/exclude_paths:\s*\n\s*- \/docs\/archive\s*\n/);
    });

    it.each([
      ['only paths', { includePaths: ['/docs'] }, 'include_paths', 'exclude_paths'],
      ['skip paths', { excludePaths: ['/tags'] }, 'exclude_paths', 'include_paths'],
    ])('sends a workflow with just the %s of the request', async (_, paths, sent, omitted) => {
      const { result } = renderSchedules();
      http.post.mockResolvedValue({ id: 'workflow-3', name: 'n', enabled: true });

      act(() => {
        result.current.createSchedule({ ...scheduleRequest, ...paths });
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expectPostedBody(expect.stringContaining(sent));
      expectPostedBody(expect.not.stringContaining(omitted));
    });

    it('sends a workflow without an index, start URLs or sitemap URLs when the request has none', async () => {
      const { result } = renderSchedules();
      http.post.mockResolvedValue({ id: 'workflow-3', name: 'n', enabled: true });

      act(() => {
        result.current.createSchedule(scheduleRequest);
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expectPostedBody(expect.not.stringContaining('index_name'));
      expectPostedBody(expect.not.stringContaining('seed_urls'));
      expectPostedBody(expect.not.stringContaining('sitemap_urls'));
    });

    it('sends the same workflow for empty URL lists and an undefined index as for none', async () => {
      const { result } = renderSchedules();
      http.post.mockResolvedValue({ id: 'workflow-3', name: 'n', enabled: true });

      act(() => {
        result.current.createSchedule({
          ...scheduleRequest,
          indexName: undefined,
          seedUrls: [],
          sitemapUrls: [],
        });
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expectPostedBody(JSON.stringify({ yaml: buildWebCrawlWorkflowYaml(scheduleRequest) }));
    });

    it('sends a workflow that crawls into the index and from the URLs of the request', async () => {
      const { result } = renderSchedules();
      http.post.mockResolvedValue({ id: 'workflow-3', name: 'n', enabled: true });
      const request: WebCrawlScheduleRequest = {
        ...scheduleRequest,
        indexName: 'docs',
        seedUrls: ['https://example.com/blog', 'https://docs.example.com'],
        sitemapUrls: ['https://example.com/sitemap-docs.xml'],
      };

      act(() => {
        result.current.createSchedule(request);
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WORKFLOW_PATH, {
        body: JSON.stringify({ yaml: buildWebCrawlWorkflowYaml(request) }),
        version: API_VERSION,
      });
      const yaml = buildWebCrawlWorkflowYaml(request);
      expect(yaml).toMatch(/index_name: docs\s*\n/);
      expect(yaml).toMatch(
        /seed_urls:\s*\n\s*- https:\/\/example\.com\/blog\s*\n\s*- https:\/\/docs\.example\.com\s*\n/
      );
      expect(yaml).toMatch(/sitemap_urls:\s*\n\s*- https:\/\/example\.com\/sitemap-docs\.xml\s*\n/);
    });

    it.each([
      ['index', { indexName: 'docs' }, 'index_name', ['seed_urls', 'sitemap_urls']],
      [
        'start URLs',
        { seedUrls: ['https://docs.example.com'] },
        'seed_urls',
        ['index_name', 'sitemap_urls'],
      ],
      [
        'sitemap URLs',
        { sitemapUrls: ['https://example.com/sitemap-docs.xml'] },
        'sitemap_urls',
        ['index_name', 'seed_urls'],
      ],
    ])('sends a workflow with just the %s of the request', async (_, targets, sent, omitted) => {
      const { result } = renderSchedules();
      http.post.mockResolvedValue({ id: 'workflow-3', name: 'n', enabled: true });

      act(() => {
        result.current.createSchedule({ ...scheduleRequest, ...targets });
      });

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expectPostedBody(expect.stringContaining(sent));
      for (const key of omitted) {
        expectPostedBody(expect.not.stringContaining(key));
      }
    });

    it('reports that it is creating while the request is in flight', async () => {
      const { result } = renderSchedules();
      http.post.mockReturnValue(new Promise(() => {}));

      act(() => {
        result.current.createSchedule(scheduleRequest);
      });

      await waitFor(() => expect(result.current.isCreating).toBe(true));
    });

    it("surfaces the server's message when the workflow cannot be created", async () => {
      const { result } = renderSchedules();
      await waitFor(() => expect(result.current.schedules).toHaveLength(2));
      http.post.mockRejectedValue(createHttpError('Invalid workflow yaml'));
      const onSuccess = jest.fn();

      act(() => {
        result.current.createSchedule(scheduleRequest, { onSuccess });
      });

      await waitFor(() => expect(result.current.createErrorMessage).toBe('Invalid workflow yaml'));
      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.isCreating).toBe(false);
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('falls back to the error message when the failure carries no body', async () => {
      const { result } = renderSchedules();
      http.post.mockRejectedValue(new Error('Network down'));

      act(() => {
        result.current.createSchedule(scheduleRequest);
      });

      await waitFor(() => expect(result.current.createErrorMessage).toBe('Network down'));
    });

    it('forgets the error when the creation is reset', async () => {
      const { result } = renderSchedules();
      http.post.mockRejectedValue(createHttpError('Invalid workflow yaml'));

      act(() => {
        result.current.createSchedule(scheduleRequest);
      });
      await waitFor(() => expect(result.current.createErrorMessage).toBe('Invalid workflow yaml'));

      act(() => {
        result.current.resetCreate();
      });

      await waitFor(() => expect(result.current.createErrorMessage).toBeUndefined());
    });
  });

  describe('workflow links', () => {
    it('builds the URL of a workflow in the Workflows app', () => {
      const { result } = renderSchedules();

      expect(result.current.getWorkflowUrl('workflow-1')).toBe('/app/workflows/workflow-1');
      expect(application.getUrlForApp).toHaveBeenCalledWith('workflows', {
        path: '/workflow-1',
      });
    });

    it('encodes the workflow id', () => {
      const { result } = renderSchedules();

      result.current.getWorkflowUrl('odd/id');

      expect(application.getUrlForApp).toHaveBeenCalledWith('workflows', { path: '/odd%2Fid' });
    });
  });
});
