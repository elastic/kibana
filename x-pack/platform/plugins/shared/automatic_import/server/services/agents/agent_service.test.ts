/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AgentService } from './agent_service';

jest.mock('../../agents', () => ({ createAutomaticImportAgent: jest.fn() }));

const { createAutomaticImportAgent } = jest.requireMock('../../agents');

describe('AgentService.invokeAutomaticImportAgent', () => {
  const invoke = jest.fn();
  const samplesIndexService = {
    getSamplesForDataStream: jest.fn().mockResolvedValue(['{"a":1}']),
  };
  const fieldsMetadataClient = {
    getECSFieldsets: jest.fn().mockResolvedValue(['source', 'user']),
  };

  const invokeAgent = (userContext: {
    integrationDescription?: string;
    dataStreamDescription?: string;
  }) =>
    new AgentService(
      samplesIndexService as never,
      loggingSystemMock.create()
    ).invokeAutomaticImportAgent(
      'my_integration',
      'my_data_stream',
      userContext,
      {} as never,
      {} as never,
      fieldsMetadataClient as never
    );

  const getSeedMessageContent = (): string => {
    const [[invokeInput]] = invoke.mock.calls;
    const [seedMessage] = invokeInput.messages;
    return seedMessage.content;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    invoke.mockResolvedValue({});
    createAutomaticImportAgent.mockReturnValue({ invoke });
  });

  it('includes both descriptions in the seed message', async () => {
    await invokeAgent({
      integrationDescription: 'Acme firewall',
      dataStreamDescription: 'Traffic logs in key=value format',
    });

    const content = getSeedMessageContent();
    expect(content).toContain('`my_integration`');
    expect(content).toContain('`my_data_stream`');
    expect(content).toContain('<integration_description>Acme firewall</integration_description>');
    expect(content).toContain(
      '<data_stream_description>Traffic logs in key=value format</data_stream_description>'
    );
  });

  it('passes the descriptions to the agent so sub-agents receive them', async () => {
    const userContext = {
      integrationDescription: 'Acme firewall',
      dataStreamDescription: 'Traffic logs',
    };

    await invokeAgent(userContext);

    expect(createAutomaticImportAgent).toHaveBeenCalledWith(
      expect.objectContaining({ userContext })
    );
  });

  it('leaves the user context out of the seed message when there are no descriptions', async () => {
    await invokeAgent({ integrationDescription: '', dataStreamDescription: '  ' });

    expect(getSeedMessageContent()).not.toContain('<user_provided_context>');
  });
});
