/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';

import { useStartServices } from '../../hooks';
import { sendGetOneAgentPolicyFull } from '../../hooks/use_request/agent_policy';
import { sendCreateStandaloneAgentAPIKey } from '../../hooks/use_request';
import { getYamlFormatters } from '../../services/yaml_formatters';

import { useFetchFullPolicy } from './hooks';

jest.mock('../../hooks', () => ({
  ...jest.requireActual('../../hooks'),
  useStartServices: jest.fn(),
}));

jest.mock('../../hooks/use_request/agent_policy', () => ({
  sendGetOneAgentPolicyFull: jest.fn(),
}));

jest.mock('../../hooks/use_request', () => ({
  ...jest.requireActual('../../hooks/use_request'),
  sendCreateStandaloneAgentAPIKey: jest.fn(),
}));

jest.mock('../../services/yaml_formatters', () => ({
  getYamlFormatters: jest.fn(),
}));

const mockNotificationsToasts = { addError: jest.fn() };

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.clearAllMocks();
  (useStartServices as jest.Mock).mockReturnValue({
    notifications: { toasts: mockNotificationsToasts },
    http: { basePath: { prepend: (path: string) => path } },
  });
  (sendCreateStandaloneAgentAPIKey as jest.Mock).mockResolvedValue({
    item: { id: 'key-id', api_key: 'key-value', encoded: 'encoded-key' },
  });
});

const mockAgentPolicy = { id: 'policy-1' } as any;

describe('useFetchFullPolicy — downloadYaml', () => {
  function mockAnchorElement() {
    const mockLink = { href: '', download: '', click: jest.fn() };
    const original = document.createElement.bind(document);
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tag, ...args) =>
        tag === 'a' ? (mockLink as any) : original(tag, ...args)
      );
    return mockLink;
  }

  it('URL-encodes YAML content in the data URI so # characters are not truncated', async () => {
    const yamlWithComment = '# This is a comment\nkey: value\n';
    (sendGetOneAgentPolicyFull as jest.Mock).mockResolvedValue({
      data: { item: yamlWithComment },
    });

    const { result } = renderHook(() => useFetchFullPolicy(mockAgentPolicy, 'IS_KUBERNETES'));
    await waitFor(() => expect(result.current.yaml).toBe(yamlWithComment));

    const mockLink = mockAnchorElement();
    act(() => result.current.downloadYaml());

    expect(mockLink.href).toBe(
      `data:text/x-yaml;charset=utf-8,${encodeURIComponent(yamlWithComment)}`
    );
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('clipboard yaml and downloaded file content are identical after encoding/decoding', async () => {
    const yamlWithSpecialChars = '# comment\nkey: value & more\nurl: http://host?a=1\n';
    (sendGetOneAgentPolicyFull as jest.Mock).mockResolvedValue({
      data: { item: yamlWithSpecialChars },
    });

    const { result } = renderHook(() => useFetchFullPolicy(mockAgentPolicy, 'IS_KUBERNETES'));
    await waitFor(() => expect(result.current.yaml).toBe(yamlWithSpecialChars));

    const mockLink = mockAnchorElement();
    act(() => result.current.downloadYaml());

    const encodedContent = mockLink.href.replace('data:text/x-yaml;charset=utf-8,', '');
    expect(decodeURIComponent(encodedContent)).toBe(result.current.yaml);
  });

  it('encodes non-kubernetes YAML produced by the policy formatter', async () => {
    const policyObject = { outputs: { default: { type: 'elasticsearch' } } };
    const formattedYaml = '# auto-generated\noutputs:\n  default:\n    type: elasticsearch\n';

    (sendGetOneAgentPolicyFull as jest.Mock).mockResolvedValue({
      data: { item: policyObject },
    });
    (getYamlFormatters as jest.Mock).mockResolvedValue({
      fullAgentPolicyToYaml: jest.fn().mockReturnValue(formattedYaml),
    });

    const { result } = renderHook(() => useFetchFullPolicy(mockAgentPolicy, 'IS_NOT_KUBERNETES'));
    await waitFor(() => expect(result.current.yaml).toBe(formattedYaml));

    const mockLink = mockAnchorElement();
    act(() => result.current.downloadYaml());

    expect(mockLink.href).toBe(
      `data:text/x-yaml;charset=utf-8,${encodeURIComponent(formattedYaml)}`
    );
  });
});
