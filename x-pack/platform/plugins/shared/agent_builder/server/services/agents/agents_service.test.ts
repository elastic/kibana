/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isAllowedBuiltinAgent } from '@kbn/onechat-server/allow_lists';
import { AgentsService } from './agents_service';
import { createMockedAgent } from '../../test_utils/agents';

jest.mock('@kbn/onechat-server/allow_lists');

const isAllowedBuiltinAgentMock = isAllowedBuiltinAgent as jest.MockedFunction<
  typeof isAllowedBuiltinAgent
>;

describe('AgentsService', () => {
  let logger: ReturnType<typeof loggerMock.create>;
  let service: AgentsService;

  beforeEach(() => {
    logger = loggerMock.create();
    service = new AgentsService();
  });

  afterEach(() => {
    isAllowedBuiltinAgentMock.mockReset();
  });

  describe('#setup', () => {
    it('allows registering allowed built-in agents', () => {
      isAllowedBuiltinAgentMock.mockReturnValue(true);

      const serviceSetup = service.setup({ logger });

      expect(() => serviceSetup.register(createMockedAgent())).not.toThrow();
    });

    it('throws an error trying to register non-allowed built-in agents', () => {
      isAllowedBuiltinAgentMock.mockReturnValue(false);

      const serviceSetup = service.setup({ logger });

      expect(() => serviceSetup.register(createMockedAgent())).toThrowErrorMatchingInlineSnapshot(`
        "Built-in agent with id \\"test_agent\\" is not in the list of allowed built-in agents.
                     Please add it to the list of allowed built-in agents in the \\"@kbn/onechat-server/allow_lists.ts\\" file."
      `);
    });
  });
});
