/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { appContextService } from '../../app_context';

import { checkNamespaceConflict } from './namespace_template_utils';

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

const MOCK_CLONE_TEMPLATE = {
  name: 'logs-nginx.access-clone',
  index_template: {
    index_patterns: ['logs-nginx.access-production'],
    priority: 300,
    template: {},
  },
};

/**
 * Simulate: NS template does not exist in ES (404 on the named call).
 * The unnamed call (all-templates lookup) returns `allTemplates`.
 */
function mockNsTemplateNotFound(
  esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>,
  allTemplates: Array<{ name: string; index_template: object }> = [MOCK_CLONE_TEMPLATE]
) {
  esClient.indices.getIndexTemplate.mockImplementation(async (params?: { name?: string }) => {
    if (params?.name) {
      throw Object.assign(new Error('Not found'), { meta: { statusCode: 404 } });
    }
    return { index_templates: allTemplates } as any;
  });
}

/** Simulate: NS template already exists in ES (returned by the named call). */
function mockNsTemplateExists(
  esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>
) {
  esClient.indices.getIndexTemplate.mockImplementation(async (params?: { name?: string }) => {
    if (params?.name === DEFAULT_ARGS.nsTemplateName) {
      return {
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
      } as any;
    }
    // all-templates lookup — NS template exists so no conflict, but return it anyway
    return { index_templates: [] };
  });
}

// ---------------------------------------------------------------------------
// checkNamespaceConflict
// ---------------------------------------------------------------------------

describe('checkNamespaceConflict', () => {
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

  it('returns a conflict when the base template appears in overlapping and the Fleet NS template does not yet exist', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [{ name: 'logs-nginx.access', index_patterns: ['logs-nginx.access-*'] }],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    // NS template doesn't exist → user clone is the winner → conflict.
    mockNsTemplateNotFound(esClient);
    const logger = makeLogger();

    const result = await checkNamespaceConflict({ esClient, logger, ...DEFAULT_ARGS });

    expect(result).not.toBeNull();
    expect(result!.dataStreamName).toBe(DEFAULT_ARGS.indexName);
    expect(result!.namespace).toBe(DEFAULT_ARGS.namespace);
    expect(result!.baseTemplateName).toBe(DEFAULT_ARGS.baseTemplateName);
    // conflictingTemplates contains the WINNER (user clone), not the ES overlapping losers.
    expect(result!.conflictingTemplates).toEqual([
      { name: 'logs-nginx.access-clone', priority: 300, conflictType: 'overrides_fleet' },
    ]);
  });

  it('includes all winning conflicting template names in the returned conflict', async () => {
    // Two user clones both win over Fleet's templates for this index.
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [{ name: 'logs-nginx.access', index_patterns: ['logs-nginx.access-*'] }],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    mockNsTemplateNotFound(esClient, [
      {
        name: 'logs-nginx.access-clone-a',
        index_template: { index_patterns: ['logs-nginx.access-production'], priority: 400 },
      },
      {
        name: 'logs-nginx.access-clone-b',
        index_template: { index_patterns: ['logs-nginx.access-*'], priority: 300 },
      },
    ]);
    const logger = makeLogger();

    const result = await checkNamespaceConflict({ esClient, logger, ...DEFAULT_ARGS });

    expect(result).not.toBeNull();
    expect(result!.conflictingTemplates).toEqual([
      { name: 'logs-nginx.access-clone-a', priority: 400, conflictType: 'overrides_fleet' },
      { name: 'logs-nginx.access-clone-b', priority: 300, conflictType: 'overrides_fleet' },
    ]);
  });

  it('classifies a conflicting template at the same priority as blocked_by_same_priority', async () => {
    // Priority 250 == Fleet NS template priority → ES will reject Fleet's PUT.
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [{ name: 'logs-nginx.access', index_patterns: ['logs-nginx.access-*'] }],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    mockNsTemplateNotFound(esClient, [
      {
        name: 'logs-nginx.access-clone',
        index_template: { index_patterns: ['logs-nginx.access-production'], priority: 250 },
      },
    ]);
    const logger = makeLogger();

    const result = await checkNamespaceConflict({ esClient, logger, ...DEFAULT_ARGS });

    expect(result).not.toBeNull();
    expect(result!.conflictingTemplates).toEqual([
      { name: 'logs-nginx.access-clone', priority: 250, conflictType: 'blocked_by_same_priority' },
    ]);
  });

  it('classifies a conflicting template at lower-than-NS priority as overridden_by_fleet', async () => {
    // Priority 220: higher than base (200) so it wins today, but Fleet NS (250) will override it.
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [{ name: 'logs-nginx.access', index_patterns: ['logs-nginx.access-*'] }],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    mockNsTemplateNotFound(esClient, [
      {
        name: 'logs-nginx.access-clone',
        index_template: { index_patterns: ['logs-nginx.access-production'], priority: 220 },
      },
    ]);
    const logger = makeLogger();

    const result = await checkNamespaceConflict({ esClient, logger, ...DEFAULT_ARGS });

    expect(result).not.toBeNull();
    expect(result!.conflictingTemplates).toEqual([
      { name: 'logs-nginx.access-clone', priority: 220, conflictType: 'overridden_by_fleet' },
    ]);
  });

  it('returns null when the base template is not in overlapping (base wins)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    const logger = makeLogger();

    const result = await checkNamespaceConflict({ esClient, logger, ...DEFAULT_ARGS });

    expect(result).toBeNull();
    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(1);
    // Early return — no need to fetch the NS template.
    expect(esClient.indices.getIndexTemplate).not.toHaveBeenCalled();
  });

  it('returns null when overlapping is absent (base wins)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    const logger = makeLogger();

    const result = await checkNamespaceConflict({ esClient, logger, ...DEFAULT_ARGS });

    expect(result).toBeNull();
    expect(esClient.indices.getIndexTemplate).not.toHaveBeenCalled();
  });

  it('returns null when the Fleet namespace template already exists and is winning (false positive prevention)', async () => {
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

    const result = await checkNamespaceConflict({ esClient, logger, ...DEFAULT_ARGS });

    expect(result).toBeNull();
    expect(esClient.indices.getIndexTemplate).toHaveBeenCalledWith(
      { name: DEFAULT_ARGS.nsTemplateName },
      expect.anything()
    );
  });

  it('returns a conflict when the Fleet namespace template is itself in overlapping (user clone at priority > 250)', async () => {
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
    // NS template is in overlapping → fetchIndexTemplate is skipped.
    // The all-templates lookup returns the high-priority user clone.
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [MOCK_CLONE_TEMPLATE],
    } as any);
    const logger = makeLogger();

    const result = await checkNamespaceConflict({ esClient, logger, ...DEFAULT_ARGS });

    expect(result).not.toBeNull();
    expect(result!.conflictingTemplates).toEqual([
      { name: 'logs-nginx.access-clone', priority: 300, conflictType: 'overrides_fleet' },
    ]);
    // fetchIndexTemplate (named call) was skipped — only the all-templates lookup ran.
    expect(esClient.indices.getIndexTemplate).toHaveBeenCalledWith({}, expect.anything());
    expect(esClient.indices.getIndexTemplate).not.toHaveBeenCalledWith(
      { name: DEFAULT_ARGS.nsTemplateName },
      expect.anything()
    );
  });

  it('returns null and debug-logs for dataset_is_prefix data streams', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = makeLogger();

    const result = await checkNamespaceConflict({
      esClient,
      logger,
      dataStream: PREFIX_DATA_STREAM,
      indexName: 'metrics-test.*-production',
      baseTemplateName: 'metrics-test',
      nsTemplateName: 'metrics-test@namespace.production',
      namespace: 'production',
      logContext: 'test',
    });

    expect(result).toBeNull();
    expect(esClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('dataset_is_prefix'));
  });

  it('returns null and debug-logs when indexName contains a wildcard', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = makeLogger();

    const result = await checkNamespaceConflict({
      esClient,
      logger,
      ...DEFAULT_ARGS,
      indexName: 'logs-nginx.access-*',
    });

    expect(result).toBeNull();
    expect(esClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('dataset_is_prefix'));
  });

  it('returns null and debug-logs when simulateIndexTemplate fails', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockRejectedValue(new Error('ES unavailable'));
    const logger = makeLogger();

    const result = await checkNamespaceConflict({ esClient, logger, ...DEFAULT_ARGS });

    expect(result).toBeNull();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('pre-existing customization check failed')
    );
  });

  it('returns null and debug-logs when the NS template existence check fails', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.simulateIndexTemplate.mockResolvedValue({
      overlapping: [{ name: 'logs-nginx.access', index_patterns: ['logs-nginx.access-*'] }],
      template: { mappings: {}, settings: {}, aliases: {} },
    } as any);
    // NS template fetch throws a non-404 error → caught by the outer non-fatal catch.
    esClient.indices.getIndexTemplate.mockRejectedValue(new Error('ES unavailable'));
    const logger = makeLogger();

    const result = await checkNamespaceConflict({ esClient, logger, ...DEFAULT_ARGS });

    expect(result).toBeNull();
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

    await checkNamespaceConflict({
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
