/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { WorkflowYaml } from '@kbn/workflows';
import { useActionPolicyConnectorTypes } from './use_action_policy_connector_types';

const mockMgetWorkflows = jest.fn();
const mockUseQuery = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({ mgetWorkflows: mockMgetWorkflows }),
}));

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  WorkflowApi: 'mock.WorkflowApi',
}));

jest.mock('@kbn/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

const emailWorkflow = { steps: [{ type: '.email', name: 'email' }] } as unknown as WorkflowYaml;
const slackWorkflow = { steps: [{ type: '.slack', name: 'slack' }] } as unknown as WorkflowYaml;

const policy = (id: string, workflowIds: string[]): ActionPolicyResponse =>
  ({
    id,
    name: id,
    destinations: workflowIds.map((wfId) => ({ type: 'workflow' as const, id: wfId })),
  } as unknown as ActionPolicyResponse);

describe('useActionPolicyConnectorTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('does not enable the query and returns empty results when there are no workflow destinations', () => {
    const { result } = renderHook(() => useActionPolicyConnectorTypes([policy('ap-1', [])]));

    expect(mockUseQuery.mock.calls[0][0].enabled).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.connectorTypesByPolicy.get('ap-1')).toEqual([]);
  });

  it('batches all workflow ids into a single deduplicated mget request', () => {
    renderHook(() =>
      useActionPolicyConnectorTypes([
        policy('ap-1', ['wf-1', 'wf-2']),
        policy('ap-2', ['wf-2', 'wf-3']),
      ])
    );

    const { queryKey, enabled } = mockUseQuery.mock.calls[0][0];
    expect(enabled).toBe(true);
    // deduplicated + sorted
    expect(queryKey).toEqual([
      'alertingV2RuleForm',
      'workflowDefinitions',
      ['wf-1', 'wf-2', 'wf-3'],
    ]);
  });

  it('maps connector types per policy from the batched definitions', () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 'wf-1', definition: emailWorkflow },
        { id: 'wf-2', definition: slackWorkflow },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useActionPolicyConnectorTypes([policy('ap-1', ['wf-1', 'wf-2']), policy('ap-2', ['wf-1'])])
    );

    expect(result.current.connectorTypesByPolicy.get('ap-1')).toEqual(['email', 'slack']);
    expect(result.current.connectorTypesByPolicy.get('ap-2')).toEqual(['email']);
  });

  it('reports loading only while the batched request is in flight', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useActionPolicyConnectorTypes([policy('ap-1', ['wf-1'])]));

    expect(result.current.isLoading).toBe(true);
  });
});
