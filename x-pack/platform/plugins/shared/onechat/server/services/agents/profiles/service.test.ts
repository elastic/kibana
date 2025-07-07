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
import * as utils from './utils';

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
    handler: () => {
      return { result: {} };
    },
  };
};

const baseProfile: Omit<AgentProfileCreateRequest, 'toolSelection'> = {
  id: 'agent-1',
  name: 'Agent',
  description: 'desc',
  customInstructions: '',
};

describe('AgentProfileServiceImpl', () => {
  it('calls validateToolSelection on create', async () => {
    const tools = [generateMockTool('toolA', 'prov1')];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const spy = jest.spyOn(utils, 'validateToolSelection').mockResolvedValue([]);
    const service = createAgentProfileService({
      client: mockClient,
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ toolIds: ['toolA'] }] };
    await service.create(profile);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('calls validateToolSelection on update if toolSelection present', async () => {
    const tools = [generateMockTool('toolA', 'prov1')];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const spy = jest.spyOn(utils, 'validateToolSelection').mockResolvedValue([]);
    const service = createAgentProfileService({
      client: mockClient,
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ toolIds: ['toolA'] }] };
    await service.update(profile);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('throws createBadRequestError on create if tool selection validation fails', async () => {
    const tools = [generateMockTool('toolA', 'prov1')];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const errorMessages = ['Invalid tool', 'Another error'];
    const spy = jest.spyOn(utils, 'validateToolSelection').mockResolvedValue(errorMessages);
    const service = createAgentProfileService({
      client: mockClient,
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ toolIds: ['toolA'] }] };
    await expect(service.create(profile)).rejects.toThrow('Agent tool selection validation failed');
    try {
      await service.create(profile);
    } catch (e: any) {
      expect(e.message).toContain('Invalid tool');
      expect(e.message).toContain('Another error');
    }
    spy.mockRestore();
  });

  it('throws createBadRequestError on update if tool selection validation fails', async () => {
    const tools = [generateMockTool('toolA', 'prov1')];
    mockToolsService.registry.list = jest.fn().mockResolvedValue(tools);
    const errorMessages = ['Invalid tool', 'Another error'];
    const spy = jest.spyOn(utils, 'validateToolSelection').mockResolvedValue(errorMessages);
    const service = createAgentProfileService({
      client: mockClient,
      toolsService: mockToolsService,
      logger: mockLogger,
      request: mockRequest,
    });
    const profile = { ...baseProfile, toolSelection: [{ toolIds: ['toolA'] }] };
    await expect(service.update(profile)).rejects.toThrow('Agent tool selection validation failed');
    try {
      await service.update(profile);
    } catch (e: any) {
      expect(e.message).toContain('Invalid tool');
      expect(e.message).toContain('Another error');
    }
    spy.mockRestore();
  });
});
