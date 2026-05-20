/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { MatcherSuggestionsService } from '../../lib/services/matcher_suggestions_service/matcher_suggestions_service';
import { createRouteDependencies } from '../test_utils';
import { MatcherDataFieldsRoute } from './matcher_data_fields_route';

const createSuggestionsService = (): jest.Mocked<MatcherSuggestionsService> =>
  ({
    getDataFieldNames: jest.fn(),
    getSuggestions: jest.fn(),
  } as unknown as jest.Mocked<MatcherSuggestionsService>);

const getResponseSchema = () => {
  const { validate } = MatcherDataFieldsRoute;
  if (!validate || typeof validate === 'boolean' || !('response' in validate)) {
    throw new Error('expected response validation to be configured');
  }
  return validate.response![200]!.body!();
};

describe('MatcherDataFieldsRoute', () => {
  it('calls getDataFieldNames with undefined when no matcher query param is provided', async () => {
    const { ctx } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({ query: {} });
    const suggestionsService = createSuggestionsService();
    suggestionsService.getDataFieldNames.mockResolvedValue(['data.host.name']);

    const route = new MatcherDataFieldsRoute(ctx, request, suggestionsService);

    await route.handle();

    expect(suggestionsService.getDataFieldNames).toHaveBeenCalledWith(undefined);
    expect(ctx.response.ok).toHaveBeenCalledWith({ body: ['data.host.name'] });
  });

  it('forwards the matcher query param to getDataFieldNames', async () => {
    const { ctx } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      query: { matcher: 'rule.id : "abc"' },
    });
    const suggestionsService = createSuggestionsService();
    suggestionsService.getDataFieldNames.mockResolvedValue([]);

    const route = new MatcherDataFieldsRoute(ctx, request, suggestionsService);

    await route.handle();

    expect(suggestionsService.getDataFieldNames).toHaveBeenCalledWith('rule.id : "abc"');
    expect(ctx.response.ok).toHaveBeenCalledWith({ body: [] });
  });

  it('returns customError when the service throws', async () => {
    const { ctx } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({ query: {} });
    const suggestionsService = createSuggestionsService();
    suggestionsService.getDataFieldNames.mockRejectedValue(new Error('boom'));

    const route = new MatcherDataFieldsRoute(ctx, request, suggestionsService);

    await route.handle();

    expect(ctx.response.customError).toHaveBeenCalledTimes(1);
  });

  describe('MatcherDataFieldsResponseSchema validation', () => {
    it('accepts an array of strings', () => {
      expect(() => getResponseSchema().parse(['data.host.name', 'data.cpu'])).not.toThrow();
    });
    it('accepts an empty array', () => {
      expect(() => getResponseSchema().parse([])).not.toThrow();
    });
    it('rejects a non-array body', () => {
      expect(() => getResponseSchema().parse({ fields: [] })).toThrow();
    });
    it('rejects an array containing non-strings', () => {
      expect(() => getResponseSchema().parse(['data.host.name', 42])).toThrow();
    });
  });
});
