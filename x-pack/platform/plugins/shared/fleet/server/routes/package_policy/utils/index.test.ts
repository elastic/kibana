/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentPolicyService } from '../../../services';
import { isAgentlessEnabled } from '../../../services/utils/agentless';

import { alignInputsAndStreams, renameAgentlessAgentPolicy } from '.';

jest.mock('../../../services/utils/agentless', () => ({
  isAgentlessEnabled: jest.fn(),
}));

jest.mock('../../../services', () => ({
  agentPolicyService: {
    get: jest.fn(),
    update: jest.fn(),
  },
}));

const mockSoClient = {} as any;
const mockEsClient = {} as any;

function makePackagePolicy(overrides: Record<string, any> = {}): any {
  return {
    id: 'pkg-policy-1',
    policy_id: 'agent-policy-1',
    name: 'My Integration',
    ...overrides,
  };
}

function makeAgentPolicy(overrides: Record<string, any> = {}): any {
  return {
    id: 'agent-policy-1',
    name: 'Agentless policy for My Integration',
    supports_agentless: true,
    ...overrides,
  };
}

describe('renameAgentlessAgentPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call agentPolicyService.update when agentless is disabled', async () => {
    jest.mocked(isAgentlessEnabled).mockReturnValue(false);

    await renameAgentlessAgentPolicy(mockSoClient, mockEsClient, makePackagePolicy(), 'New Name');

    expect(agentPolicyService.update).not.toHaveBeenCalled();
  });

  it('does not call agentPolicyService.update when the package policy has no policy_id', async () => {
    jest.mocked(isAgentlessEnabled).mockReturnValue(true);

    await renameAgentlessAgentPolicy(
      mockSoClient,
      mockEsClient,
      makePackagePolicy({ policy_id: undefined }),
      'New Name'
    );

    expect(agentPolicyService.update).not.toHaveBeenCalled();
  });

  it('does not call agentPolicyService.update when the agent policy does not support agentless', async () => {
    jest.mocked(isAgentlessEnabled).mockReturnValue(true);
    jest
      .mocked(agentPolicyService.get)
      .mockResolvedValue(makeAgentPolicy({ supports_agentless: false }));

    await renameAgentlessAgentPolicy(mockSoClient, mockEsClient, makePackagePolicy(), 'New Name');

    expect(agentPolicyService.update).not.toHaveBeenCalled();
  });

  it('does not call agentPolicyService.update when the derived name already matches', async () => {
    jest.mocked(isAgentlessEnabled).mockReturnValue(true);
    // "Agentless policy for My Integration" is the name produced by getAgentlessAgentPolicyNameFromPackagePolicyName
    jest
      .mocked(agentPolicyService.get)
      .mockResolvedValue(makeAgentPolicy({ name: 'Agentless policy for My Integration' }));

    await renameAgentlessAgentPolicy(
      mockSoClient,
      mockEsClient,
      makePackagePolicy(),
      'My Integration'
    );

    expect(agentPolicyService.update).not.toHaveBeenCalled();
  });

  it('calls agentPolicyService.update with bumpRevision: false when the name changes', async () => {
    jest.mocked(isAgentlessEnabled).mockReturnValue(true);
    jest
      .mocked(agentPolicyService.get)
      .mockResolvedValue(makeAgentPolicy({ name: 'Agentless policy for Old Name' }));
    jest.mocked(agentPolicyService.update).mockResolvedValue({} as any);

    await renameAgentlessAgentPolicy(mockSoClient, mockEsClient, makePackagePolicy(), 'New Name');

    expect(agentPolicyService.update).toHaveBeenCalledTimes(1);
    expect(agentPolicyService.update).toHaveBeenCalledWith(
      mockSoClient,
      mockEsClient,
      'agent-policy-1',
      { name: 'Agentless policy for New Name' },
      { force: true, bumpRevision: false }
    );
  });

  it('does not bump the revision so that packagePolicyService.update triggers the single deployment', async () => {
    jest.mocked(isAgentlessEnabled).mockReturnValue(true);
    jest
      .mocked(agentPolicyService.get)
      .mockResolvedValue(makeAgentPolicy({ name: 'Agentless policy for Old Name' }));
    jest.mocked(agentPolicyService.update).mockResolvedValue({} as any);

    await renameAgentlessAgentPolicy(
      mockSoClient,
      mockEsClient,
      makePackagePolicy(),
      'Renamed Integration'
    );

    const callOptions = jest.mocked(agentPolicyService.update).mock.calls[0][4];
    expect(callOptions).toMatchObject({ bumpRevision: false });
  });
});

describe('alignInputsAndStreams', () => {
  it('should turn input.enabled to false if all its streams are disabled', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: true,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs-2',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual([
      {
        type: 'input-logs',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs-2',
            },
          },
        ],
      },
    ]);
  });

  it('should turn input.enabled to false if its only stream is disabled', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: true,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual([
      {
        type: 'input-logs',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
        ],
      },
    ]);
  });

  it('should not do anything if an input is not enabled and has some of its streams enabled', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: false,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs-2',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual(inputs);
  });

  it('should not do anything if an input is enabled and has at least a stream enabled', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual(inputs);
  });

  it('should not do anything if an input is enabled and all its streams enabled', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual(inputs);
  });

  it('should not not do anything if an input is not enabled and all its streams are disabled too', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual(inputs);
  });

  it('should not do anything if an input is enabled but has no streams', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: true,
        streams: [],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual(inputs);
  });
});
