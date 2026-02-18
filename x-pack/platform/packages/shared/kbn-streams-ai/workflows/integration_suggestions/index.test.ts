/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ToolMessage } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { Feature } from '@kbn/streams-schema';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { suggestIntegrations, type PackageSearchProvider } from '.';
import type { IntegrationPackageInfo, IntegrationSuggestionInput } from './types';

const BEGIN_MARKER = '<<<BEGIN_INTERNAL>>>';
const END_MARKER = '<<<END_INTERNAL>>>';

const mockTokens = { prompt: 10, completion: 20, total: 30 };

describe('suggestIntegrations', () => {
  let logger: MockedLogger;
  let inferenceClient: jest.Mocked<BoundInferenceClient>;
  let packageSearchProvider: jest.Mocked<PackageSearchProvider>;
  let abortController: AbortController;

  const createFeature = (overrides: Partial<Feature> = {}): Feature => ({
    uuid: 'test-uuid',
    id: 'test-feature',
    stream_name: 'logs-test-default',
    type: 'technology',
    subtype: 'database_engine',
    description: 'A test database feature',
    title: 'Test Feature',
    properties: {},
    confidence: 85,
    status: 'active',
    last_seen: new Date().toISOString(),
    ...overrides,
  });

  const createPackageInfo = (overrides: Partial<IntegrationPackageInfo> = {}): IntegrationPackageInfo => ({
    name: 'test-package',
    title: 'Test Package',
    description: 'A test package',
    version: '1.0.0',
    categories: ['monitoring'],
    ...overrides,
  });

  const createInput = (overrides: Partial<IntegrationSuggestionInput> = {}): IntegrationSuggestionInput => ({
    streamName: 'logs-test-default',
    features: [createFeature()],
    ...overrides,
  });

  const createFinalizeToolCall = (suggestions: Array<{ packageName: string; featureId: string; reason: string }>) => ({
    function: {
      name: 'finalize_suggestions',
      arguments: { suggestions },
    },
    toolCallId: `finalize-${Date.now()}`,
  });

  beforeEach(() => {
    logger = loggerMock.create();
    abortController = new AbortController();

    inferenceClient = {
      prompt: jest.fn(),
    } as Partial<jest.Mocked<BoundInferenceClient>> as jest.Mocked<BoundInferenceClient>;

    packageSearchProvider = {
      searchPackages: jest.fn().mockResolvedValue([]),
    };
  });

  it('returns empty suggestions when no features provided', async () => {
    const input = createInput({ features: [] });

    const result = await suggestIntegrations({
      input,
      inferenceClient,
      packageSearchProvider,
      logger,
      signal: abortController.signal,
    });

    expect(result).toEqual({
      streamName: 'logs-test-default',
      suggestions: [],
    });
    expect(inferenceClient.prompt).not.toHaveBeenCalled();
  });

  it('calls search_integrations tool and returns results to agent', async () => {
    const packages = [
      createPackageInfo({ name: 'mysql_otel', title: 'MySQL (OTel)' }),
      createPackageInfo({ name: 'nginx_otel', title: 'Nginx (OTel)' }),
    ];
    packageSearchProvider.searchPackages.mockResolvedValue(packages);

    inferenceClient.prompt
      .mockResolvedValueOnce({
        content: `${BEGIN_MARKER}searching for integrations${END_MARKER}`,
        toolCalls: [
          {
            function: { name: 'search_integrations', arguments: { searchTerm: 'mysql' } },
            toolCallId: 'search-1',
          },
        ],
        tokens: mockTokens,
      })
      .mockResolvedValueOnce({
        content: `${BEGIN_MARKER}analyzing results${END_MARKER}`,
        toolCalls: [
          {
            function: { name: 'reason', arguments: {} },
            toolCallId: 'reason-1',
          },
        ],
        tokens: mockTokens,
      })
      .mockResolvedValueOnce({
        content: 'finalizing',
        toolCalls: [
          createFinalizeToolCall([
            { packageName: 'mysql_otel', featureId: 'test-feature', reason: 'MySQL detected' },
          ]),
        ],
        tokens: mockTokens,
      });

    const input = createInput({
      features: [createFeature({ id: 'test-feature', title: 'MySQL Database' })],
    });

    const result = await suggestIntegrations({
      input,
      inferenceClient,
      packageSearchProvider,
      logger,
      signal: abortController.signal,
    });

    expect(packageSearchProvider.searchPackages).toHaveBeenCalledWith('mysql');

    const secondCallArgs = inferenceClient.prompt.mock.calls[1][0];
    const toolMessage = secondCallArgs.prevMessages?.find(
      (m): m is ToolMessage => m.role === MessageRole.Tool && m.name === 'search_integrations'
    );
    expect(toolMessage?.response).toMatchObject({
      packages: packages.map((p) => ({
        name: p.name,
        title: p.title,
        description: p.description,
        categories: p.categories,
      })),
      total: 2,
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      packageName: 'mysql_otel',
      featureId: 'test-feature',
      featureTitle: 'MySQL Database',
      reason: 'MySQL detected',
    });
  });

  it('handles search_integrations errors gracefully', async () => {
    packageSearchProvider.searchPackages.mockRejectedValue(new Error('Fleet unavailable'));

    inferenceClient.prompt
      .mockResolvedValueOnce({
        content: `${BEGIN_MARKER}searching${END_MARKER}`,
        toolCalls: [
          {
            function: { name: 'search_integrations', arguments: {} },
            toolCallId: 'search-1',
          },
        ],
        tokens: mockTokens,
      })
      .mockResolvedValueOnce({
        content: `${BEGIN_MARKER}analyzing error${END_MARKER}`,
        toolCalls: [
          {
            function: { name: 'reason', arguments: {} },
            toolCallId: 'reason-1',
          },
        ],
        tokens: mockTokens,
      })
      .mockResolvedValueOnce({
        content: 'finalizing with no suggestions due to error',
        toolCalls: [createFinalizeToolCall([])],
        tokens: mockTokens,
      });

    const input = createInput();

    const result = await suggestIntegrations({
      input,
      inferenceClient,
      packageSearchProvider,
      logger,
      signal: abortController.signal,
    });

    const secondCallArgs = inferenceClient.prompt.mock.calls[1][0];
    const toolMessage = secondCallArgs.prevMessages?.find(
      (m): m is ToolMessage => m.role === MessageRole.Tool && m.name === 'search_integrations'
    );
    expect(toolMessage?.response).toMatchObject({
      error: 'Fleet unavailable',
      packages: [],
      total: 0,
    });

    expect(result.suggestions).toHaveLength(0);
  });

  it('filters out suggestions with invalid feature IDs', async () => {
    inferenceClient.prompt.mockResolvedValueOnce({
      content: 'finalizing',
      toolCalls: [
        createFinalizeToolCall([
          { packageName: 'mysql_otel', featureId: 'valid-feature', reason: 'Valid' },
          { packageName: 'nginx_otel', featureId: 'invalid-feature', reason: 'Invalid' },
        ]),
      ],
      tokens: mockTokens,
    });

    const input = createInput({
      features: [createFeature({ id: 'valid-feature', title: 'Valid Feature' })],
    });

    const result = await suggestIntegrations({
      input,
      inferenceClient,
      packageSearchProvider,
      logger,
      signal: abortController.signal,
      options: { maxSteps: 0 },
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].featureId).toBe('valid-feature');
  });

  it('uses feature id as title when title is undefined', async () => {
    inferenceClient.prompt.mockResolvedValueOnce({
      content: 'finalizing',
      toolCalls: [
        createFinalizeToolCall([
          { packageName: 'mysql_otel', featureId: 'mysql-db-feature', reason: 'MySQL detected' },
        ]),
      ],
      tokens: mockTokens,
    });

    const input = createInput({
      features: [createFeature({ id: 'mysql-db-feature', title: undefined })],
    });

    const result = await suggestIntegrations({
      input,
      inferenceClient,
      packageSearchProvider,
      logger,
      signal: abortController.signal,
      options: { maxSteps: 0 },
    });

    expect(result.suggestions[0].featureTitle).toBe('mysql-db-feature');
  });

  it('returns error when inference client fails', async () => {
    inferenceClient.prompt.mockRejectedValue(new Error('LLM unavailable'));

    const input = createInput();

    const result = await suggestIntegrations({
      input,
      inferenceClient,
      packageSearchProvider,
      logger,
      signal: abortController.signal,
    });

    expect(result).toEqual({
      streamName: 'logs-test-default',
      suggestions: [],
      error: 'LLM unavailable',
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('handles multiple features and maps them correctly', async () => {
    inferenceClient.prompt.mockResolvedValueOnce({
      content: 'finalizing',
      toolCalls: [
        createFinalizeToolCall([
          { packageName: 'mysql_otel', featureId: 'mysql-feature', reason: 'MySQL DB' },
          { packageName: 'nginx_otel', featureId: 'nginx-feature', reason: 'Nginx server' },
        ]),
      ],
      tokens: mockTokens,
    });

    const input = createInput({
      features: [
        createFeature({ id: 'mysql-feature', title: 'MySQL Database' }),
        createFeature({ id: 'nginx-feature', title: 'Nginx Web Server' }),
      ],
    });

    const result = await suggestIntegrations({
      input,
      inferenceClient,
      packageSearchProvider,
      logger,
      signal: abortController.signal,
      options: { maxSteps: 0 },
    });

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions).toContainEqual({
      packageName: 'mysql_otel',
      featureId: 'mysql-feature',
      featureTitle: 'MySQL Database',
      reason: 'MySQL DB',
    });
    expect(result.suggestions).toContainEqual({
      packageName: 'nginx_otel',
      featureId: 'nginx-feature',
      featureTitle: 'Nginx Web Server',
      reason: 'Nginx server',
    });
  });

  it('passes maxSteps option to reasoning agent', async () => {
    inferenceClient.prompt.mockResolvedValueOnce({
      content: 'finalizing',
      toolCalls: [createFinalizeToolCall([])],
      tokens: mockTokens,
    });

    const input = createInput();

    await suggestIntegrations({
      input,
      inferenceClient,
      packageSearchProvider,
      logger,
      signal: abortController.signal,
      options: { maxSteps: 0 },
    });

    expect(inferenceClient.prompt).toHaveBeenCalled();
  });

  it('calls searchPackages without term when searchTerm is undefined', async () => {
    packageSearchProvider.searchPackages.mockResolvedValue([createPackageInfo()]);

    inferenceClient.prompt
      .mockResolvedValueOnce({
        content: `${BEGIN_MARKER}listing all packages${END_MARKER}`,
        toolCalls: [
          {
            function: { name: 'search_integrations', arguments: {} },
            toolCallId: 'search-1',
          },
        ],
        tokens: mockTokens,
      })
      .mockResolvedValueOnce({
        content: `${BEGIN_MARKER}reasoning${END_MARKER}`,
        toolCalls: [
          {
            function: { name: 'reason', arguments: {} },
            toolCallId: 'reason-1',
          },
        ],
        tokens: mockTokens,
      })
      .mockResolvedValueOnce({
        content: 'finalizing',
        toolCalls: [createFinalizeToolCall([])],
        tokens: mockTokens,
      });

    const input = createInput();

    await suggestIntegrations({
      input,
      inferenceClient,
      packageSearchProvider,
      logger,
      signal: abortController.signal,
    });

    expect(packageSearchProvider.searchPackages).toHaveBeenCalledWith(undefined);
  });

  it('includes feature properties in prompt input', async () => {
    inferenceClient.prompt.mockResolvedValueOnce({
      content: 'finalizing',
      toolCalls: [createFinalizeToolCall([])],
      tokens: mockTokens,
    });

    const input = createInput({
      features: [
        createFeature({
          id: 'mysql-feature',
          type: 'technology',
          title: 'MySQL',
          properties: { technology: 'mysql', version: '8.0' },
          confidence: 95,
        }),
      ],
    });

    await suggestIntegrations({
      input,
      inferenceClient,
      packageSearchProvider,
      logger,
      signal: abortController.signal,
      options: { maxSteps: 0 },
    });

    const promptArgs = inferenceClient.prompt.mock.calls[0][0];
    expect(promptArgs.input).toMatchObject({
      stream_name: 'logs-test-default',
    });
    expect(promptArgs.input.features_json).toContain('mysql-feature');
    expect(promptArgs.input.features_json).toContain('technology');
    expect(promptArgs.input.features_json).toContain('mysql');
  });
});
