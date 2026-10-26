/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { ApiPrivileges } from '@kbn/core-security-server';
import { IMPACT_PROPOSAL_SUMMARY_URL } from '../../../common/impact/constants';
import type { ImpactRouteDependencies } from '../types';
import { registerGetProposalImpactPillsRoute } from './get_proposal_impact_pills';

const register = () => {
  const router = httpServiceMock.createRouter();
  const addVersion = jest.fn();
  let config:
    | { path: string; security?: { authz?: { requiredPrivileges?: string[] } } }
    | undefined;
  (router.versioned.get as jest.Mock).mockImplementation((routeConfig) => {
    config = routeConfig;
    return { addVersion };
  });

  registerGetProposalImpactPillsRoute({
    router,
    logger: loggingSystemMock.createLogger(),
    getImpactPillsService: jest.fn(),
  } as unknown as ImpactRouteDependencies);

  const validateQuery = (query: unknown) =>
    addVersion.mock.calls[0][0].validate.request.query(query, {
      ok: (value: unknown) => ({ value }),
      badRequest: (message: string) => ({ error: message }),
    });

  return { config: config!, validateQuery };
};

describe('registerGetProposalImpactPillsRoute', () => {
  it('requires the proposals read privilege', () => {
    const { config } = register();

    expect(config.path).toBe(IMPACT_PROPOSAL_SUMMARY_URL);
    expect(config.security?.authz?.requiredPrivileges).toEqual([ApiPrivileges.read('proposals')]);
  });

  it('reads a single category as a one-item list', () => {
    const { validateQuery } = register();

    expect(validateQuery({ origin: 'alertzero', categories: 'respond' })).toEqual({
      value: { origin: 'alertzero', categories: ['respond'], from: 0, size: 10 },
    });
  });

  it('reads the page the client asks for', () => {
    const { validateQuery } = register();

    expect(
      validateQuery({ origin: 'alertzero', categories: 'respond', from: '20', size: '10' })
    ).toEqual({
      value: { origin: 'alertzero', categories: ['respond'], from: 20, size: 10 },
    });
  });

  it('reads repeated categories and the closed window', () => {
    const { validateQuery } = register();

    expect(
      validateQuery({
        origin: 'alertzero',
        categories: ['respond', 'investigate'],
        decidedWithinHours: '72',
      })
    ).toEqual({
      value: {
        origin: 'alertzero',
        categories: ['respond', 'investigate'],
        decidedWithinHours: 72,
        from: 0,
        size: 10,
      },
    });
  });

  it.each([
    ['an unknown origin', { origin: 'nope', categories: 'respond' }],
    ['no categories', { origin: 'alertzero' }],
    ['too many categories', { origin: 'alertzero', categories: Array(11).fill('respond') }],
    ['an overlong category', { origin: 'alertzero', categories: 'x'.repeat(65) }],
    ['an empty page', { origin: 'alertzero', categories: 'respond', size: 0 }],
    ['an oversized page', { origin: 'alertzero', categories: 'respond', size: 101 }],
    ['a negative offset', { origin: 'alertzero', categories: 'respond', from: -1 }],
    ['a page past the reach', { origin: 'alertzero', categories: 'respond', from: 9995, size: 10 }],
    [
      'a window past a week',
      { origin: 'alertzero', categories: 'respond', decidedWithinHours: 169 },
    ],
  ])('rejects %s', (_name, query) => {
    const { validateQuery } = register();

    expect(validateQuery(query)).toHaveProperty('error');
  });
});
