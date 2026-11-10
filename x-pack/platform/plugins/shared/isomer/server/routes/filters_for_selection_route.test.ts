/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import type { Filter } from '@kbn/es-query';
import type { ChartEvent } from '@kbn/isomer';
import { metricExamples } from '@kbn/isomer';
import {
  FILTERS_FOR_SELECTION_API_PATH,
  FILTERS_FOR_SELECTION_API_VERSION,
  MATERIALIZE_FEATURE_FLAG,
} from '../../common/constants';
import { SelectionError } from '../materialize/selection/filters_for_selection';
import { createNodeValidator } from '../materialize/validate_node';
import { isomerPluginMock } from '../mocks';
import { registerFiltersForSelectionRoute } from './filters_for_selection_route';
import { filtersForSelectionRequestBodySchema } from './schemas';

const [{ node }] = metricExamples;
const event: ChartEvent = {
  node: 'panel-1',
  kind: 'select',
  target: 'tile',
  rows: [0],
  columns: ['host'],
  description: 'host: web-01',
  values: { host: 'web-01' },
};
const filter: Filter = { meta: { index: '1234' }, query: { match_phrase: { host: 'web-01' } } };

const setup = () => {
  const router = httpServiceMock.createRouter();
  const addVersion = jest.fn();
  (router.versioned.post as jest.Mock).mockReturnValue({ addVersion });
  const client = isomerPluginMock.createScopedClient();
  client.filtersForSelection.mockResolvedValue([filter]);
  const createClient = jest.fn(() => client);
  registerFiltersForSelectionRoute({ router, createClient, validateNode: createNodeValidator() });
  const [[versionConfig, handler]] = addVersion.mock.calls as Array<[unknown, RequestHandler]>;
  return { router, versionConfig, handler, client, createClient };
};

const handlerContext = (enabled: boolean) => {
  const getBooleanValue = jest.fn(async () => enabled);
  const savedObjectsClient = savedObjectsClientMock.create();
  return {
    getBooleanValue,
    savedObjectsClient,
    context: {
      core: Promise.resolve({
        featureFlags: { getBooleanValue },
        savedObjects: { client: savedObjectsClient },
      }),
    } as unknown as Parameters<RequestHandler>[0],
  };
};

const run = async (enabled: boolean, body: object) => {
  const route = setup();
  const { context, getBooleanValue, savedObjectsClient } = handlerContext(enabled);
  const response = httpServerMock.createResponseFactory();
  const request = httpServerMock.createKibanaRequest({ body });
  await route.handler(context, request, response);
  return { ...route, response, request, getBooleanValue, savedObjectsClient };
};

describe('registerFiltersForSelectionRoute', () => {
  it('registers a public versioned POST route', () => {
    const { router, versionConfig } = setup();
    expect(FILTERS_FOR_SELECTION_API_PATH).toBe('/api/isomer/filters_for_selection');
    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: FILTERS_FOR_SELECTION_API_PATH, access: 'public' })
    );
    expect(versionConfig).toEqual(
      expect.objectContaining({ version: FILTERS_FOR_SELECTION_API_VERSION })
    );
  });

  it('returns 404 when materialization is off', async () => {
    const { response, createClient, getBooleanValue } = await run(false, { event, node });
    expect(getBooleanValue).toHaveBeenCalledWith(MATERIALIZE_FEATURE_FLAG, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('returns the filters as the requesting user', async () => {
    const { response, createClient, client, request, savedObjectsClient } = await run(true, {
      event,
      node,
    });
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ request, savedObjectsClient })
    );
    expect(client.filtersForSelection).toHaveBeenCalledWith(event, node);
    expect(response.ok).toHaveBeenCalledWith({ body: { filters: [filter] } });
  });

  it('returns 400 for a node that does not validate', async () => {
    const { response, client } = await run(true, {
      event,
      node: { ...node, value: { column: 'missing' } },
    });
    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: expect.stringMatching(/^Invalid node: value\.column /) },
    });
    expect(client.filtersForSelection).not.toHaveBeenCalled();
  });

  it('returns 400 for a selection that does not fit the node', async () => {
    const route = setup();
    route.client.filtersForSelection.mockRejectedValue(
      new SelectionError('Column "host" did not come from a Kibana table.')
    );
    const { context } = handlerContext(true);
    const response = httpServerMock.createResponseFactory();
    await route.handler(
      context,
      httpServerMock.createKibanaRequest({ body: { event, node } }),
      response
    );
    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'Column "host" did not come from a Kibana table.' },
    });
  });
});

describe('filtersForSelectionRequestBodySchema', () => {
  it('accepts select and brush events with a node', () => {
    expect(filtersForSelectionRequestBodySchema.safeParse({ event, node }).success).toBe(true);
    const brush = {
      node: 'p',
      kind: 'brush',
      column: 't',
      range: [0, 1],
      description: '',
      values: {},
    };
    expect(filtersForSelectionRequestBodySchema.safeParse({ event: brush, node }).success).toBe(
      true
    );
    const datum = {
      ...event,
      target: 'datum',
      seriesKey: 'count',
      series: { layer: 0, y: 0 },
    };
    expect(filtersForSelectionRequestBodySchema.safeParse({ event: datum, node }).success).toBe(
      true
    );
  });

  it('refuses malformed or unbounded input', () => {
    const refused = [
      { event },
      { event: { ...event, kind: 'hover' }, node },
      { event: { ...event, rows: [] }, node },
      { event: { ...event, columns: Array(101).fill('a') }, node },
      { event: { ...event, extra: true }, node },
      { event, node: { text: 'no type' } },
    ];
    for (const body of refused) {
      expect(filtersForSelectionRequestBodySchema.safeParse(body).success).toBe(false);
    }
  });
});
