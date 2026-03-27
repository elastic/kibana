/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardCmd } from './dashboard';
import { DASHBOARD_ID, DATA_VIEW_ID } from '../../dashboard';

const createMockLog = () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  success: jest.fn(),
  write: jest.fn(),
  getWriters: jest.fn(),
  getWritten$: jest.fn(),
  indent: jest.fn(),
});

const createMockFlagsReader = (overrides: Record<string, unknown> = {}) => {
  const flags: Record<string, unknown> = {
    delete: false,
    'dry-run': false,
    'kibana-url': undefined,
    ...overrides,
  };

  return {
    boolean: jest.fn((name: string) => flags[name] as boolean),
    string: jest.fn((name: string) => flags[name] as string | undefined),
    enum: jest.fn(),
    stringArray: jest.fn(),
    path: jest.fn(),
    number: jest.fn(),
  };
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const textResponse = (body: string, status: number) => new Response(body, { status });

describe('dashboardCmd', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    global.fetch = jest.fn();
    delete process.env.EVALUATIONS_KBN_URL;
    delete process.env.KIBANA_URL;
    delete process.env.EVALUATIONS_KBN_API_KEY;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  describe('metadata', () => {
    it('has the correct command name', () => {
      expect(dashboardCmd.name).toBe('dashboard');
    });

    it('defines boolean flags for delete and dry-run', () => {
      expect(dashboardCmd.flags?.boolean).toContain('delete');
      expect(dashboardCmd.flags?.boolean).toContain('dry-run');
    });

    it('defines string flag for kibana-url', () => {
      expect(dashboardCmd.flags?.string).toContain('kibana-url');
    });
  });

  describe('--dry-run', () => {
    it('logs dashboard and data view bodies without making fetch calls', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'dry-run': true });

      await dashboardCmd.run({ log, flagsReader } as any);

      expect(global.fetch).not.toHaveBeenCalled();

      const infoCalls = log.info.mock.calls.map(([msg]: [string]) => msg);
      const joined = infoCalls.join('\n');

      expect(joined).toContain('Data View');
      expect(joined).toContain('POST /api/data_views/data_view');
      expect(joined).toContain('Dashboard');
      expect(joined).toContain(DASHBOARD_ID);
      expect(joined).toContain(DATA_VIEW_ID);
      expect(joined).toContain('Total panels:');
    });
  });

  describe('create (default mode)', () => {
    it('creates data view and dashboard on success', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      expect(global.fetch).toHaveBeenCalledTimes(2);

      const [dvUrl, dvOpts] = (global.fetch as jest.Mock).mock.calls[0];
      expect(dvUrl).toBe('http://localhost:5620/api/data_views/data_view');
      expect(dvOpts.method).toBe('POST');
      expect(dvOpts.headers).toHaveProperty('Authorization');
      expect(dvOpts.headers.Authorization).toMatch(/^Basic /);
      expect(dvOpts.headers['kbn-xsrf']).toBe('true');
      expect(dvOpts.headers['X-Elastic-Internal-Origin']).toBe('Kibana');

      const [dashUrl, dashOpts] = (global.fetch as jest.Mock).mock.calls[1];
      expect(dashUrl).toContain(`/internal/dashboards/app/${DASHBOARD_ID}`);
      expect(dashOpts.method).toBe('POST');
      expect(dashOpts.headers['elastic-api-version']).toBe('1');

      const infoCalls = log.info.mock.calls.map(([msg]: [string]) => msg);
      expect(infoCalls.some((m) => m.includes('created/updated'))).toBe(true);
    });

    it('skips data view creation on 409 conflict', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(textResponse('conflict', 409))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      const infoCalls = log.info.mock.calls.map(([msg]: [string]) => msg);
      expect(infoCalls.some((m) => m.includes('already exists, skipping'))).toBe(true);
    });

    it('falls back to PUT when dashboard POST returns 409', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(textResponse('conflict', 409))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      expect(global.fetch).toHaveBeenCalledTimes(3);
      const [, putOpts] = (global.fetch as jest.Mock).mock.calls[2];
      expect(putOpts.method).toBe('PUT');

      const infoCalls = log.info.mock.calls.map(([msg]: [string]) => msg);
      expect(infoCalls.some((m) => m.includes('already exists, updating'))).toBe(true);
    });

    it('throws on non-OK dashboard response', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(textResponse('server error', 500));

      await expect(dashboardCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        /Failed to create\/update dashboard: 500/
      );
    });

    it('warns on unexpected data view status', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(textResponse('bad request', 400))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      expect(log.warning).toHaveBeenCalled();
      const [msg] = log.warning.mock.calls[0];
      expect(msg).toContain('400');
    });
  });

  describe('--delete', () => {
    it('deletes dashboard and data view on success', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        delete: true,
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(jsonResponse({}));

      await dashboardCmd.run({ log, flagsReader } as any);

      expect(global.fetch).toHaveBeenCalledTimes(2);

      const [dashUrl, dashOpts] = (global.fetch as jest.Mock).mock.calls[0];
      expect(dashUrl).toContain(`/api/dashboards/${DASHBOARD_ID}`);
      expect(dashOpts.method).toBe('DELETE');

      const [dvUrl, dvOpts] = (global.fetch as jest.Mock).mock.calls[1];
      expect(dvUrl).toContain(`/api/data_views/data_view/${DATA_VIEW_ID}`);
      expect(dvOpts.method).toBe('DELETE');

      const infoCalls = log.info.mock.calls.map(([msg]: [string]) => msg);
      expect(infoCalls.some((m) => m.includes('Dashboard deleted'))).toBe(true);
      expect(infoCalls.some((m) => m.includes('Data view deleted'))).toBe(true);
    });

    it('handles 404 gracefully for dashboard', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        delete: true,
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(textResponse('not found', 404))
        .mockResolvedValueOnce(jsonResponse({}));

      await dashboardCmd.run({ log, flagsReader } as any);

      const infoCalls = log.info.mock.calls.map(([msg]: [string]) => msg);
      expect(infoCalls.some((m) => m.includes('not found, already deleted'))).toBe(true);
    });

    it('handles 404 gracefully for data view', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        delete: true,
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(textResponse('not found', 404));

      await dashboardCmd.run({ log, flagsReader } as any);

      const infoCalls = log.info.mock.calls.map(([msg]: [string]) => msg);
      expect(infoCalls.some((m) => m.includes('Data view') && m.includes('not found'))).toBe(true);
    });

    it('warns on unexpected delete status', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        delete: true,
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(textResponse('error', 500))
        .mockResolvedValueOnce(textResponse('error', 500));

      await dashboardCmd.run({ log, flagsReader } as any);

      expect(log.warning).toHaveBeenCalledTimes(2);
    });
  });

  describe('URL resolution', () => {
    it('uses --kibana-url flag when provided', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'dry-run': true,
        'kibana-url': 'http://custom:9999',
      });

      await dashboardCmd.run({ log, flagsReader } as any);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('falls back to EVALUATIONS_KBN_URL env var', async () => {
      process.env.EVALUATIONS_KBN_URL = 'http://elastic:pass@env-host:5620';
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      const [dvUrl] = (global.fetch as jest.Mock).mock.calls[0];
      expect(dvUrl).toContain('env-host:5620');
      expect(dvUrl).not.toContain('elastic');
    });

    it('falls back to KIBANA_URL env var', async () => {
      process.env.KIBANA_URL = 'http://elastic:pass@kibana-env:5601';
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      const [dvUrl] = (global.fetch as jest.Mock).mock.calls[0];
      expect(dvUrl).toContain('kibana-env:5601');
    });

    it('prefers EVALUATIONS_KBN_URL over KIBANA_URL', async () => {
      process.env.EVALUATIONS_KBN_URL = 'http://elastic:pass@priority:5620';
      process.env.KIBANA_URL = 'http://elastic:pass@fallback:5601';
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      const [dvUrl] = (global.fetch as jest.Mock).mock.calls[0];
      expect(dvUrl).toContain('priority:5620');
    });

    it('sets process.exitCode on invalid URL', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'not-a-valid-url',
      });

      await dashboardCmd.run({ log, flagsReader } as any);

      expect(process.exitCode).toBe(1);
      expect(log.error).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();

      process.exitCode = undefined;
    });
  });

  describe('authentication headers', () => {
    it('strips credentials from URL in fetch calls', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://myuser:mypass@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      for (const [url] of (global.fetch as jest.Mock).mock.calls) {
        expect(url).not.toContain('myuser');
        expect(url).not.toContain('mypass');
      }
    });

    it('uses Basic auth from URL credentials', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
      const expected = Buffer.from('elastic:changeme').toString('base64');
      expect(opts.headers.Authorization).toBe(`Basic ${expected}`);
    });

    it('uses API key from env var when available', async () => {
      process.env.EVALUATIONS_KBN_API_KEY = 'test-api-key-123';
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
      expect(opts.headers.Authorization).toBe('ApiKey test-api-key-123');
    });

    it('API key takes precedence over URL credentials', async () => {
      process.env.EVALUATIONS_KBN_API_KEY = 'api-key-priority';
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://elastic:changeme@localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
      expect(opts.headers.Authorization).toBe('ApiKey api-key-priority');
      expect(opts.headers.Authorization).not.toContain('Basic');
    });

    it('includes required Kibana headers in all requests', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      for (const [, opts] of (global.fetch as jest.Mock).mock.calls) {
        expect(opts.headers['kbn-xsrf']).toBe('true');
        expect(opts.headers['Content-Type']).toBe('application/json');
        expect(opts.headers['X-Elastic-Internal-Origin']).toBe('Kibana');
      }
    });
  });

  describe('request body content', () => {
    it('sends valid data view body in create request', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      const [, dvOpts] = (global.fetch as jest.Mock).mock.calls[0];
      const dvBody = JSON.parse(dvOpts.body);
      expect(dvBody.data_view.id).toBe(DATA_VIEW_ID);
      expect(dvBody.data_view.title).toBe('kibana-evaluations*');
      expect(dvBody.data_view.timeFieldName).toBe('@timestamp');
    });

    it('sends valid dashboard body in create request', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      const [, dashOpts] = (global.fetch as jest.Mock).mock.calls[1];
      const dashBody = JSON.parse(dashOpts.body);
      expect(dashBody.title).toBe('@kbn/evals Dashboard');
      expect(dashBody.panels).toHaveLength(8);
      expect(dashBody.time_range).toEqual({ from: 'now-30d', to: 'now' });
    });

    it('includes AbortSignal timeout in all fetch calls', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://localhost:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      for (const [, opts] of (global.fetch as jest.Mock).mock.calls) {
        expect(opts.signal).toBeDefined();
      }
    });
  });

  describe('dashboard view URL', () => {
    it('logs the correct dashboard URL after creation', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'kibana-url': 'http://elastic:changeme@my-kibana:5620',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(jsonResponse({ data_view: { id: DATA_VIEW_ID } }))
        .mockResolvedValueOnce(jsonResponse({ id: DASHBOARD_ID }));

      await dashboardCmd.run({ log, flagsReader } as any);

      const infoCalls = log.info.mock.calls.map(([msg]: [string]) => msg);
      const viewMsg = infoCalls.find((m) => m.includes('View at:'));
      expect(viewMsg).toBeDefined();
      expect(viewMsg).toContain('http://my-kibana:5620/app/dashboards#/view/');
      expect(viewMsg).not.toContain('elastic');
      expect(viewMsg).not.toContain('changeme');
    });
  });
});
