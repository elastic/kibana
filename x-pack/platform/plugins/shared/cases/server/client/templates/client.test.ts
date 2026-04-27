/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTemplatesSubClient } from './client';
import type { CasesClientArgs } from '../types';

const buildArgs = (
  scheduleRegenerationSpy: jest.Mock,
  overrides: { templateExists?: boolean; createThrows?: boolean } = {}
) => {
  const { templateExists = true, createThrows = false } = overrides;
  const templatesService = {
    getAllTemplates: jest.fn(),
    getTemplate: jest.fn(async () =>
      templateExists
        ? { id: 'tmpl-1', attributes: { owner: 'securitySolution' } }
        : undefined
    ),
    createTemplate: jest.fn(async () => {
      if (createThrows) {
        throw new Error('quota exceeded');
      }
      return { id: 'tmpl-1', attributes: { owner: 'securitySolution' } };
    }),
    updateTemplate: jest.fn(async () => ({
      id: 'tmpl-1',
      attributes: { owner: 'securitySolution' },
    })),
    deleteTemplate: jest.fn(async () => undefined),
    getTags: jest.fn(),
    getAuthors: jest.fn(),
  };
  const authorization = { ensureAuthorized: jest.fn(async () => undefined) };
  const viewSyncService = { scheduleRegeneration: scheduleRegenerationSpy };
  const args = {
    services: { templatesService },
    authorization,
    user: { username: 'tester' },
    getViewSyncService: () => viewSyncService,
  } as unknown as CasesClientArgs;
  return { args, templatesService, authorization, viewSyncService };
};

describe('templatesSubClient view-sync wiring', () => {
  it('schedules a view regeneration after a successful createTemplate', async () => {
    const spy = jest.fn();
    const { args } = buildArgs(spy);
    const client = createTemplatesSubClient(args);
    await client.createTemplate({ owner: 'securitySolution' } as never);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('schedules a view regeneration after a successful updateTemplate', async () => {
    const spy = jest.fn();
    const { args } = buildArgs(spy);
    const client = createTemplatesSubClient(args);
    await client.updateTemplate('tmpl-1', { owner: 'securitySolution' } as never);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('schedules a view regeneration after a successful deleteTemplate', async () => {
    const spy = jest.fn();
    const { args } = buildArgs(spy);
    const client = createTemplatesSubClient(args);
    await client.deleteTemplate('tmpl-1');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does NOT schedule regeneration when the underlying create throws', async () => {
    /*
     * FAILURE SCENARIO: a template create fails authorization or hits a
     * service error. The view union is unchanged, so no regeneration is
     * needed — and crucially, scheduling one would mask whether the write
     * actually succeeded if a future test were to assert ordering.
     */
    const spy = jest.fn();
    const { args } = buildArgs(spy, { createThrows: true });
    const client = createTemplatesSubClient(args);
    await expect(
      client.createTemplate({ owner: 'securitySolution' } as never)
    ).rejects.toThrow('quota exceeded');
    expect(spy).not.toHaveBeenCalled();
  });

  it('does NOT schedule regeneration when updateTemplate hits a not-found short-circuit', async () => {
    const spy = jest.fn();
    const { args } = buildArgs(spy, { templateExists: false });
    const client = createTemplatesSubClient(args);
    await expect(
      client.updateTemplate('missing', { owner: 'securitySolution' } as never)
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
    expect(spy).not.toHaveBeenCalled();
  });

  it('is a no-op when getViewSyncService returns null (indices mode / probe failed)', async () => {
    const templatesService = {
      getAllTemplates: jest.fn(),
      getTemplate: jest.fn(),
      createTemplate: jest.fn(async () => ({
        id: 'tmpl-1',
        attributes: { owner: 'securitySolution' },
      })),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      getTags: jest.fn(),
      getAuthors: jest.fn(),
    };
    const authorization = { ensureAuthorized: jest.fn(async () => undefined) };
    const args = {
      services: { templatesService },
      authorization,
      user: { username: 'tester' },
      getViewSyncService: () => null,
    } as unknown as CasesClientArgs;
    const client = createTemplatesSubClient(args);
    // The point: this resolves without throwing despite the null sync service.
    await expect(
      client.createTemplate({ owner: 'securitySolution' } as never)
    ).resolves.toBeDefined();
  });
});
