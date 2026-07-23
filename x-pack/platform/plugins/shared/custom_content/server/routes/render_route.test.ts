/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLResults } from '@kbn/esql-utils';
import { fillTemplate } from '../utils/fill_template';
import { registerRenderRoute } from './render_route';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLResults: jest.fn(),
}));

jest.mock('@kbn/datemath', () => ({
  __esModule: true,
  default: {
    parse: jest.fn((val: string, opts?: { roundUp?: boolean }) => ({
      toISOString: () => (opts?.roundUp ? '2024-01-08T00:00:00.000Z' : '2024-01-01T00:00:00.000Z'),
    })),
  },
}));

jest.mock('../utils/fill_template', () => ({
  fillTemplate: jest.fn(
    (_template: string, _cols: unknown, _rows: unknown) => '<p>filled</p>'
  ) as jest.MockedFunction<typeof fillTemplate>,
}));

const mockGetESQLResults = getESQLResults as jest.MockedFunction<typeof getESQLResults>;
const mockFillTemplate = fillTemplate as jest.MockedFunction<typeof fillTemplate>;

interface RequestBody {
  template: string;
  esqlQuery: string;
  timeRange?: { from: string; to: string };
  timeField?: string;
}

function buildMocks({ featureFlagEnabled = true }: { featureFlagEnabled?: boolean } = {}) {
  const handler = jest.fn();
  const router = {
    post: jest.fn((_config: unknown, h: typeof handler) => {
      handler.mockImplementation(h);
    }),
  };

  const coreStart = {
    featureFlags: {
      getBooleanValue: jest.fn().mockReturnValue(featureFlagEnabled),
    },
  };
  const scopedSearch = jest.fn();
  const data = { search: { asScoped: jest.fn().mockReturnValue({ search: scopedSearch }) } };
  const getStartServices = jest.fn().mockResolvedValue([coreStart, { data }]);

  const context = {};
  const request: { body: RequestBody } = {
    body: {
      template:
        '<html><body>{% for row in rows %}<p>{{ row["host"].value }}</p>{% endfor %}</body></html>',
      esqlQuery: 'FROM logs | STATS count BY host',
    },
  };

  const response = {
    ok: jest.fn((r) => r),
    notFound: jest.fn(() => ({ status: 404 })),
    customError: jest.fn((r) => ({ status: r.statusCode, ...r })),
  };

  const logger = { error: jest.fn(), debug: jest.fn() };

  return {
    router: router as unknown as Parameters<typeof registerRenderRoute>[0],
    handler,
    getStartServices: getStartServices as unknown as Parameters<typeof registerRenderRoute>[1],
    logger: logger as unknown as Parameters<typeof registerRenderRoute>[2],
    loggerError: logger.error,
    context,
    request,
    response,
  };
}

describe('registerRenderRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetESQLResults.mockResolvedValue({
      response: {
        columns: [{ name: 'host', type: 'keyword' }],
        values: [['web-1']],
      },
      params: { query: '' },
    } as Awaited<ReturnType<typeof getESQLResults>>);
  });

  it('registers a POST handler at the internal render path', () => {
    const { router, getStartServices, logger } = buildMocks();
    registerRenderRoute(router, getStartServices, logger);

    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/internal/custom_content/render' }),
      expect.any(Function)
    );
  });

  it('returns 404 when the feature flag is disabled', async () => {
    const { router, handler, getStartServices, logger, context, request, response } = buildMocks({
      featureFlagEnabled: false,
    });
    registerRenderRoute(router, getStartServices, logger);

    await handler(context, request, response);

    expect(response.notFound).toHaveBeenCalled();
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('fetches ES|QL data and returns rendered html', async () => {
    const { router, handler, getStartServices, logger, context, request, response } = buildMocks();
    registerRenderRoute(router, getStartServices, logger);

    await handler(context, request, response);

    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({ esqlQuery: request.body.esqlQuery })
    );
    expect(response.ok).toHaveBeenCalledWith({ body: { html: '<p>filled</p>' } });
  });

  it('builds and forwards a range filter when timeField and timeRange are both provided', async () => {
    const { router, handler, getStartServices, logger, context, request, response } = buildMocks();
    registerRenderRoute(router, getStartServices, logger);
    request.body = {
      ...request.body,
      timeRange: { from: 'now-7d', to: 'now' },
      timeField: '@timestamp',
    };

    await handler(context, request, response);

    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          range: {
            '@timestamp': {
              gte: '2024-01-01T00:00:00.000Z',
              lt: '2024-01-08T00:00:00.000Z',
              format: 'strict_date_optional_time',
            },
          },
        },
      })
    );
  });

  it('passes no filter when timeField is missing', async () => {
    const { router, handler, getStartServices, logger, context, request, response } = buildMocks();
    registerRenderRoute(router, getStartServices, logger);
    request.body = { ...request.body, timeRange: { from: 'now-7d', to: 'now' } };

    await handler(context, request, response);

    expect(mockGetESQLResults).toHaveBeenCalledWith(expect.objectContaining({ filter: undefined }));
  });

  it('passes no filter when neither timeRange nor timeField are provided', async () => {
    const { router, handler, getStartServices, logger, context, request, response } = buildMocks();
    registerRenderRoute(router, getStartServices, logger);

    await handler(context, request, response);

    expect(mockGetESQLResults).toHaveBeenCalledWith(expect.objectContaining({ filter: undefined }));
  });

  it('returns a 500 when getESQLResults throws', async () => {
    const { router, handler, getStartServices, logger, context, request, response, loggerError } =
      buildMocks();
    registerRenderRoute(router, getStartServices, logger);
    mockGetESQLResults.mockRejectedValue(new Error('index_not_found_exception'));

    await handler(context, request, response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(loggerError).toHaveBeenCalledWith(expect.stringContaining('index_not_found_exception'));
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns a 500 when fillTemplate throws', async () => {
    const { router, handler, getStartServices, logger, context, request, response, loggerError } =
      buildMocks();
    registerRenderRoute(router, getStartServices, logger);
    mockFillTemplate.mockImplementation(() => {
      throw new Error('invalid_liquid_template');
    });

    await handler(context, request, response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(loggerError).toHaveBeenCalledWith(expect.stringContaining('invalid_liquid_template'));
    expect(response.ok).not.toHaveBeenCalled();
  });
});
