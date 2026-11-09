/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentValidationRequest } from '@kbn/streams-schema';
import { toComponentChecker } from './component_check';

const request: ComponentValidationRequest = {
  kind: 'processor',
  component: { id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] },
};

const httpError = (status: number | undefined, message: string) =>
  Object.assign(new Error(message), {
    name: 'HttpFetchError',
    request: {},
    response: status === undefined ? undefined : { status },
    body: { message },
  });

describe('toComponentChecker', () => {
  it('reports a valid component with its warnings', async () => {
    const diagnostics = [{ severity: 'warning' as const, code: 'W1', message: 'deprecated' }];
    await expect(
      toComponentChecker(jest.fn().mockResolvedValue({ valid: true, diagnostics }))(request)
    ).resolves.toEqual({ status: 'valid', diagnostics });
  });

  it('explains a rejection that came without diagnostics', async () => {
    const check = await toComponentChecker(
      jest.fn().mockResolvedValue({ valid: false, diagnostics: [] })
    )(request);
    expect(check).toMatchObject({
      status: 'invalid',
      diagnostics: [{ severity: 'error', message: expect.stringContaining('without details') }],
    });
  });

  it.each([
    ['no response', undefined],
    ['a 502', 502],
    ['a 503', 503],
  ])('treats %s as the configuration service being unreachable', async (_, status) => {
    await expect(
      toComponentChecker(jest.fn().mockRejectedValue(httpError(status, 'unreachable')))(request)
    ).resolves.toEqual({ status: 'unchecked' });
  });

  it.each([400, 403, 413])(
    'shows a %s as an error instead of skipping the check',
    async (status) => {
      await expect(
        toComponentChecker(jest.fn().mockRejectedValue(httpError(status, 'rejected')))(request)
      ).resolves.toEqual({ status: 'failed', message: 'rejected' });
    }
  );
});
