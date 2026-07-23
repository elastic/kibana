/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { appContextService } from '../../app_context';

import { warnIfPreexistingCustomization } from './namespace_template_utils';

jest.mock('../../app_context');
jest.mock('../elasticsearch/retry', () => ({
  retryTransientEsErrors: jest.fn((fn: () => Promise<unknown>) => fn()),
}));

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

function makeLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;
}

const BASE_DATA_STREAM = { dataset: 'nginx.access', type: 'logs' } as any;
const PREFIX_DATA_STREAM = { dataset: 'test', type: 'metrics', dataset_is_prefix: true } as any;

const DEFAULT_ARGS = {
  dataStream: BASE_DATA_STREAM,
  indexName: 'logs-nginx.access-production',
  baseTemplateName: 'logs-nginx.access',
  nsTemplateName: 'logs-nginx.access@namespace.production',
  namespace: 'production',
  logContext: 'test',
};

/** Simulate: NS template does not exist in ES (404). */
function mockNsTemplateNotFound(
  esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>
) {
  esClient.indices.getIndexTemplate.mockRejectedValue({ meta: { statusCode: 404 } });
}

/** Simulate: NS template already exists in ES (returned by getIndexTemplate). */
function mockNsTemplateExists(
  esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>
) {
  esClient.indices.getIndexTemplate.mockResolvedValue({
    index_templates: [
      {
        name: DEFAULT_ARGS.nsTemplateName,
        index_template: {
          composed_of: [
            'logs-nginx.access@package',
            'production@custom',
            'logs-nginx.access@custom',
          ],
          index_patterns: ['logs-nginx.access-production'],
          priority: 250,
          template: { settings: {}, mappings: {} },
          data_stream: {},
        },
      },
    ],
  } as any);
}

// ---------------------------------------------------------------------------
// warnIfPreexistingCustomization
// ---------------------------------------------------------------------------

describe('warnIfPreexistingCustomization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAppContextService.getExperimentalFeatures.mockReturnValue({} as any);
    // fetchIndexTemplate (called internally for the NS template existence check) reads
    // the logger via appContextService.getLogger() — mock it so it doesn't throw.
    mockedAppContextService.getLogger.mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any);
  });

  it('logs a warning when the base template appears in overlapping and the Fleet NS template does not yet exist', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [{ name: 'logs-nginx.access', index_patterns: ['logs-nginx.access-*'] }],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    // NS template doesn't exist → user clone is the winner → warn.
    mockNsTemplateNotFound(esClient);
    const logger = makeLogger();

    await warnIfPreexistingCustomization({ esClient, logger, ...DEFAULT_ARGS });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"logs-nginx.access-production"')
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"logs-nginx.access"'));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('logs-nginx.access@namespace.production')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('opt the namespace out and back in to retry')
    );
  });

  it('includes all overlapping template names in the warning message', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [
        { name: 'logs-nginx.access', index_patterns: ['logs-nginx.access-*'] },
        { name: 'logs-nginx.access-clone', index_patterns: ['logs-nginx.access-production*'] },
      ],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    mockNsTemplateNotFound(esClient);
    const logger = makeLogger();

    await warnIfPreexistingCustomization({ esClient, logger, ...DEFAULT_ARGS });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('logs-nginx.access, logs-nginx.access-clone')
    );
  });

  it('does not warn when the base template is not in overlapping (base wins)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    const logger = makeLogger();

    await warnIfPreexistingCustomization({ esClient, logger, ...DEFAULT_ARGS });

    expect(logger.warn).not.toHaveBeenCalled();
    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(1);
    // Early return — no need to fetch the NS template.
    expect(esClient.indices.getIndexTemplate).not.toHaveBeenCalled();
  });

  it('does not warn when overlapping is absent (base wins)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    const logger = makeLogger();

    await warnIfPreexistingCustomization({ esClient, logger, ...DEFAULT_ARGS });

    expect(logger.warn).not.toHaveBeenCalled();
    expect(esClient.indices.getIndexTemplate).not.toHaveBeenCalled();
  });

  it('does not warn when the Fleet namespace template already exists and is winning (false positive prevention)', async () => {
    // Scenario: the Fleet NS template was created in a previous sync and is winning over
    // the base template. On a retry or reinstall the simulate result looks like a conflict
    // but it is actually expected behavior.
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [{ name: 'logs-nginx.access', index_patterns: ['logs-nginx.access-*'] }],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    // Fleet NS template exists → it is the winner, not a user clone.
    mockNsTemplateExists(esClient);
    const logger = makeLogger();

    await warnIfPreexistingCustomization({ esClient, logger, ...DEFAULT_ARGS });

    expect(logger.warn).not.toHaveBeenCalled();
    expect(esClient.indices.getIndexTemplate).toHaveBeenCalledWith(
      { name: DEFAULT_ARGS.nsTemplateName },
      expect.anything()
    );
  });

  it('warns when the Fleet namespace template is itself in overlapping (user clone at priority > 250)', async () => {
    // Scenario: a user clone at priority > 250 beats Fleet's NS template (250), which in
    // turn beats the base (200). Both Fleet NS and base appear in overlapping.
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [
        {
          name: 'logs-nginx.access@namespace.production',
          index_patterns: ['logs-nginx.access-production'],
        },
        { name: 'logs-nginx.access', index_patterns: ['logs-nginx.access-*'] },
      ],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    const logger = makeLogger();

    await warnIfPreexistingCustomization({ esClient, logger, ...DEFAULT_ARGS });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    // No need to fetch the NS template — it's already in overlapping.
    expect(esClient.indices.getIndexTemplate).not.toHaveBeenCalled();
  });

  it('skips the simulate call and debug-logs for dataset_is_prefix data streams', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = makeLogger();

    await warnIfPreexistingCustomization({
      esClient,
      logger,
      dataStream: PREFIX_DATA_STREAM,
      indexName: 'metrics-test.*-production',
      baseTemplateName: 'metrics-test',
      nsTemplateName: 'metrics-test@namespace.production',
      namespace: 'production',
      logContext: 'test',
    });

    expect(esClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('dataset_is_prefix'));
  });

  it('skips the simulate call and debug-logs when indexName contains a wildcard', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = makeLogger();

    await warnIfPreexistingCustomization({
      esClient,
      logger,
      ...DEFAULT_ARGS,
      indexName: 'logs-nginx.access-*',
    });

    expect(esClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('dataset_is_prefix'));
  });

  it('does not throw and debug-logs when simulateIndexTemplate fails', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockRejectedValue(new Error('ES unavailable'));
    const logger = makeLogger();

    await expect(
      warnIfPreexistingCustomization({ esClient, logger, ...DEFAULT_ARGS })
    ).resolves.toBeUndefined();

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('pre-existing customization check failed')
    );
  });

  it('does not throw and debug-logs when the NS template existence check fails', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [{ name: 'logs-nginx.access', index_patterns: ['logs-nginx.access-*'] }],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    // NS template fetch throws a non-404 error → caught by the outer non-fatal catch.
    esClient.indices.getIndexTemplate.mockRejectedValue(new Error('ES unavailable'));
    const logger = makeLogger();

    await expect(
      warnIfPreexistingCustomization({ esClient, logger, ...DEFAULT_ARGS })
    ).resolves.toBeUndefined();

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('pre-existing customization check failed')
    );
  });

  it('passes the abort signal to the simulate call', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    const logger = makeLogger();
    const signal = new AbortController().signal;

    await warnIfPreexistingCustomization({
      esClient,
      logger,
      signal,
      ...DEFAULT_ARGS,
    });

    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledWith(
      { name: DEFAULT_ARGS.indexName },
      { signal }
    );
  });
});
