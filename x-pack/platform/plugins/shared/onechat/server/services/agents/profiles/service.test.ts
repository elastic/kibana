/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { createAgentProfileService } from './service';
import type { AgentProfileCreateRequest } from '../../../../common/agent_profiles';
import { createMockedAgentProfileClient } from '../../../test_utils/agents';
import { RegisteredToolWithMeta } from '../../tools/types';
import { createToolsServiceStartMock } from '../../../test_utils/tools';

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');

const mockRequest = {} as KibanaRequest;
const mockClient = createMockedAgentProfileClient();
const mockToolsService = createToolsServiceStartMock();
const generateMockTool = (id: string, providerId: string): RegisteredToolWithMeta => {
  return {
    id,
    description: '',
    meta: { providerId, tags: [] },
    schema: z.object({}),
    handler: () => undefined,
  };
};

const baseProfile: Omit<AgentProfileCreateRequest, 'toolSelection'> = {
  id: 'agent-1',
  name: 'Agent',
  description: 'desc',
  customInstructions: '',
};

describe('AgentProfileServiceImpl.validateToolSelection', () => {
  const toolA1 = generateMockTool('toolA', 'prov1');
  const toolA2 = generateMockTool('toolA', 'prov2');
  const toolB = generateMockTool('toolB', 'prov1');

  it('throws if tool id is ambiguous (multiple providers, no provider specified)', async () => {
    const tools = [toolA1, toolA2];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const service = createAgentProfileService({
      client: mockClient,
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ toolIds: ['toolA'] }] };
    await expect(service.create(profile)).rejects.toThrow(
      /Tool id 'toolA' is ambiguous. Please specify a provider/
    );
  });

  it('throws if tool id does not exist in any provider', async () => {
    const tools = [toolA1, toolB];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const service = createAgentProfileService({
      client: mockClient,
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ toolIds: ['nonexistent'] }] };
    await expect(service.create(profile)).rejects.toThrow(
      /Tool id 'nonexistent' does not exist in any provider/
    );
  });

  it('throws if provider does not exist', async () => {
    const tools = [toolA1, toolB];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const service = createAgentProfileService({
      client: mockClient,
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ provider: 'provX', toolIds: ['toolA'] }] };
    await expect(service.create(profile)).rejects.toThrow(
      /Provider 'provX' does not exist or has no tools/
    );
  });

  it('throws if provider has no tools (wildcard)', async () => {
    const tools = [toolA1, toolB];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const service = createAgentProfileService({
      client: mockClient,
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ provider: 'prov2', toolIds: ['*'] }] };
    // Remove all tools for prov2
    mockToolsService.registry.list = jest.fn().mockResolvedValue([toolA1, toolB]);
    await expect(service.create(profile)).rejects.toThrow(
      /Provider 'prov2' does not exist or has no tools/
    );
  });

  it('throws if tool id does not exist for provider', async () => {
    const tools = [toolA1, toolB];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const service = createAgentProfileService({
      client: mockClient,
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ provider: 'prov1', toolIds: ['toolC'] }] };
    await expect(service.create(profile)).rejects.toThrow(
      /Tool id 'toolC' does not exist for provider 'prov1'/
    );
  });

  it('passes for valid tool id with provider', async () => {
    const tools = [toolA1, toolB];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const service = createAgentProfileService({
      client: { ...mockClient, create: jest.fn() },
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ provider: 'prov1', toolIds: ['toolA'] }] };
    await expect(service.create(profile)).resolves.not.toThrow();
  });

  it('passes for valid tool id without provider (unambiguous)', async () => {
    const tools = [toolB];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const service = createAgentProfileService({
      client: { ...mockClient, create: jest.fn() },
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ toolIds: ['toolB'] }] };
    await expect(service.create(profile)).resolves.not.toThrow();
  });

  it('passes for wildcard tool selection (all tools)', async () => {
    const tools = [toolA1, toolB];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const service = createAgentProfileService({
      client: { ...mockClient, create: jest.fn() },
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ toolIds: ['*'] }] };
    await expect(service.create(profile)).resolves.not.toThrow();
  });

  it('passes for wildcard tool selection for provider (all tools for provider)', async () => {
    const tools = [toolA1, toolB];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const service = createAgentProfileService({
      client: { ...mockClient, create: jest.fn() },
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ provider: 'prov1', toolIds: ['*'] }] };
    await expect(service.create(profile)).resolves.not.toThrow();
  });
});
