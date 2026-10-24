/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { apiError, createContextManager } from '../test_helpers';
import { resolveSavedQuery } from './resolve_saved_query';

const FIND = 'GET /api/osquery/saved_queries';

const callerReturning = (data: unknown[] | Error) =>
  createContextManager({ [FIND]: () => (data instanceof Error ? data : { data }) });

const codeOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e) => e
  );
  expect(error).toBeInstanceOf(ExecutionError);

  return (error as ExecutionError).details?.code;
};

describe('resolveSavedQuery', () => {
  it('looks the name up as an exact id filter, never as a search', async () => {
    const contextManager = callerReturning([
      {
        id: 'procs_linux',
        query: 'SELECT pid FROM processes',
        ecs_mapping: { 'process.pid': { field: 'pid' } },
        timeout: 120,
      },
    ]);

    const resolved = await resolveSavedQuery(contextManager, 'procs_linux');

    expect(contextManager.callKibanaApi).toHaveBeenCalledTimes(1);
    expect(contextManager.callKibanaApi.mock.calls[0][0].query).toEqual({
      id: 'procs_linux',
      page: 1,
      pageSize: 2,
    });
    expect(resolved).toEqual({
      id: 'procs_linux',
      query: 'SELECT pid FROM processes',
      ecs_mapping: { 'process.pid': { field: 'pid' } },
      timeout: 120,
    });
  });

  it('fails with SAVED_QUERY_NOT_FOUND when nothing matches', async () => {
    expect(await codeOf(resolveSavedQuery(callerReturning([]), 'missing'))).toBe(
      'SAVED_QUERY_NOT_FOUND'
    );
  });

  it('tells the user to install the integration assets in the space', async () => {
    await expect(resolveSavedQuery(callerReturning([]), 'missing')).rejects.toThrow(
      /install the integration assets in this space/
    );
  });

  it('fails with SAVED_QUERY_AMBIGUOUS when more than one matches', async () => {
    const twice = [
      { id: 'dup', query: 'SELECT 1' },
      { id: 'dup', query: 'SELECT 2' },
    ];

    expect(await codeOf(resolveSavedQuery(callerReturning(twice), 'dup'))).toBe(
      'SAVED_QUERY_AMBIGUOUS'
    );
  });

  it.each(["SELECT * FROM users WHERE name = '{{user.name}}'", 'SELECT {{ field }}'])(
    'fails with SAVED_QUERY_HAS_PLACEHOLDERS for %s',
    async (sql) => {
      expect(await codeOf(resolveSavedQuery(callerReturning([{ id: 'p', query: sql }]), 'p'))).toBe(
        'SAVED_QUERY_HAS_PLACEHOLDERS'
      );
    }
  );

  it('does not treat single braces as placeholders', async () => {
    const resolved = await resolveSavedQuery(
      callerReturning([{ id: 'p', query: "SELECT '{}' AS braces" }]),
      'p'
    );

    expect(resolved.query).toBe("SELECT '{}' AS braces");
  });

  it.each(['', '   ', 'a/b'])(
    'rejects the rendered name %j without calling the route',
    async (name) => {
      const contextManager = callerReturning([{ id: 'other', query: 'SELECT 1' }]);

      expect(await codeOf(resolveSavedQuery(contextManager, name))).toBe('SAVED_QUERY_NOT_FOUND');
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
    }
  );

  it('ignores rows whose id is not the requested name', async () => {
    const contextManager = callerReturning([{ id: 'other', query: 'SELECT 1' }]);

    expect(await codeOf(resolveSavedQuery(contextManager, 'wanted'))).toBe('SAVED_QUERY_NOT_FOUND');
  });

  it('maps a 403 to MISSING_PRIVILEGE', async () => {
    expect(await codeOf(resolveSavedQuery(callerReturning(apiError(403)), 'p'))).toBe(
      'MISSING_PRIVILEGE'
    );
  });

  it('rethrows a server error as is', async () => {
    await expect(resolveSavedQuery(callerReturning(apiError(500)), 'p')).rejects.toMatchObject({
      status: 500,
    });
  });
});
