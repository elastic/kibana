/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ImportsApi } from './imports_api';

const IMPORT = {
  id: 'import-1',
  name: 'Datadog',
  kind: 'custom',
  enabled: true,
  source: 'datadog',
  connector_id: 'connector-1',
  workflow_id: 'workflow-1',
  tags: [],
  routing_tags: [],
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: null,
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('ImportsApi', () => {
  const http = httpServiceMock.createStartContract();
  const api = new ImportsApi(http);

  beforeEach(() => jest.clearAllMocks());

  it('lists imports with the search and page size', async () => {
    http.get.mockResolvedValue({ items: [IMPORT], total: 1, page: 1, per_page: 100 });

    const response = await api.listImports({ per_page: 100, search: 'data' });

    expect(http.get).toHaveBeenCalledWith('/internal/alerting/v2/imports', {
      query: { page: undefined, per_page: 100, search: 'data' },
    });
    expect(response.items).toHaveLength(1);
  });

  it('fails loudly when the server response does not match the schema', async () => {
    http.get.mockResolvedValue({ items: [{ id: 'import-1' }], total: 1, page: 1, per_page: 100 });

    await expect(api.listImports()).rejects.toThrow();
  });

  it('posts for stats without a body', async () => {
    http.post.mockResolvedValue({ items: [] });

    await api.getImportStats();

    expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/imports/_stats');
  });

  it('creates an import and parses the one-time credentials', async () => {
    http.post.mockResolvedValue({
      import: IMPORT,
      url: 'https://kibana.test/hook',
      credentials: { url: 'https://kibana.test/hook', token: 'token' },
      public_base_url_configured: true,
    });

    const response = await api.createImport({ name: 'Datadog' });

    expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/imports', {
      body: JSON.stringify({ name: 'Datadog' }),
    });
    expect(response.credentials?.token).toBe('token');
  });

  it('creates a managed import and parses a response without credentials', async () => {
    http.post.mockResolvedValue({
      import: { ...IMPORT, kind: 'managed', connector_type_id: '.datadog' },
      url: 'https://kibana.test/api/actions/events/.datadog/dd-1',
      public_base_url_configured: true,
    });

    const response = await api.createImport({ kind: 'managed', connector_id: 'dd-1' });

    expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/imports', {
      body: JSON.stringify({ kind: 'managed', connector_id: 'dd-1' }),
    });
    expect(response.credentials).toBeUndefined();
    expect(response.url).toBe('https://kibana.test/api/actions/events/.datadog/dd-1');
  });

  it('patches an import by id', async () => {
    http.patch.mockResolvedValue({ ...IMPORT, enabled: false });

    const response = await api.updateImport('import-1', { enabled: false });

    expect(http.patch).toHaveBeenCalledWith('/internal/alerting/v2/imports/import-1', {
      body: JSON.stringify({ enabled: false }),
    });
    expect(response.enabled).toBe(false);
  });

  it('encodes the id in the path', async () => {
    http.get.mockResolvedValue(IMPORT);

    await api.getImport('a/b');

    expect(http.get).toHaveBeenCalledWith('/internal/alerting/v2/imports/a%2Fb');
  });

  it('deletes with the deleteResources flag', async () => {
    http.delete.mockResolvedValue(undefined);

    await api.deleteImport('import-1', true);

    expect(http.delete).toHaveBeenCalledWith('/internal/alerting/v2/imports/import-1', {
      query: { deleteResources: true },
    });
  });

  it('rotates the token', async () => {
    http.post.mockResolvedValue({
      credentials: { url: 'https://kibana.test/hook', token: 'new' },
      public_base_url_configured: false,
    });

    const response = await api.rotateImportToken('import-1');

    expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/imports/import-1/_rotate_token');
    expect(response.credentials.token).toBe('new');
  });

  it('sends a test alert', async () => {
    http.post.mockResolvedValue({ execution_id: 'execution-1', payload: { test: true } });

    const response = await api.testImport('import-1');

    expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/imports/import-1/_test', {
      body: JSON.stringify({}),
    });
    expect(response.execution_id).toBe('execution-1');
  });
});
