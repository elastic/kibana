/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { IMPACT_ESCALATION_SUMMARY_URL } from '../../../common/impact/constants';
import type { ImpactRouteDependencies } from '../types';
import { registerGetEscalationImpactPillsRoute } from './get_escalation_impact_pills';

const register = () => {
  const router = httpServiceMock.createRouter();
  const addVersion = jest.fn();
  let path: string | undefined;
  (router.versioned.get as jest.Mock).mockImplementation((routeConfig) => {
    path = routeConfig.path;
    return { addVersion };
  });

  registerGetEscalationImpactPillsRoute({
    router,
    logger: loggingSystemMock.createLogger(),
    getImpactPillsService: jest.fn(),
  } as unknown as ImpactRouteDependencies);

  const validateQuery = (query: unknown) =>
    addVersion.mock.calls[0][0].validate.request.query(query, {
      ok: (value: unknown) => ({ value }),
      badRequest: (message: string) => ({ error: message }),
    });

  return { path, validateQuery };
};

describe('registerGetEscalationImpactPillsRoute', () => {
  it('serves the escalation summary url', () => {
    expect(register().path).toBe(IMPACT_ESCALATION_SUMMARY_URL);
  });

  it('defaults to the first page of ten', () => {
    expect(register().validateQuery({})).toEqual({ value: { from: 0, size: 10 } });
  });

  it('reads the page the client asks for', () => {
    expect(register().validateQuery({ from: '10', size: '10' })).toEqual({
      value: { from: 10, size: 10 },
    });
  });

  it.each([
    ['an empty page', { size: 0 }],
    ['an oversized page', { size: 101 }],
    ['a negative offset', { from: -1 }],
    ['a page past the reach', { from: 9995, size: 10 }],
  ])('rejects %s', (_name, query) => {
    expect(register().validateQuery(query)).toHaveProperty('error');
  });
});
