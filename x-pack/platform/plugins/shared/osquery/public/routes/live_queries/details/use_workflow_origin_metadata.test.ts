/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { WORKFLOWS_GLOBAL_EXECUTIONS_VIEW_ENABLED_SETTING_ID } from '@kbn/workflows/common/constants';
import { useKibana } from '../../../common/lib/kibana';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';
import { useWorkflowOriginMetadata } from './use_workflow_origin_metadata';

jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const WORKFLOW_ORIGIN: LiveQueryDetailsItem['origin'] = {
  type: 'workflow',
  run_id: 'a4cfc2a2-48d3-47f4-a4f7-c71da8f8d488',
  verified: false,
};

const mockServices = ({
  workflowsNavLink = true,
  executionsViewEnabled = true,
}: { workflowsNavLink?: boolean; executionsViewEnabled?: boolean } = {}) => {
  const getUrlForApp = jest.fn(
    (appId: string, { path }: { path?: string } = {}) => `/app/${appId}${path ?? ''}`
  );
  const get = jest.fn((key: string, defaultValue: boolean) =>
    key === WORKFLOWS_GLOBAL_EXECUTIONS_VIEW_ENABLED_SETTING_ID
      ? executionsViewEnabled
      : defaultValue
  );
  useKibanaMock.mockReturnValue({
    services: {
      application: {
        capabilities: { navLinks: { workflows: workflowsNavLink } },
        getUrlForApp,
      },
      settings: { globalClient: { get } },
    },
  } as unknown as ReturnType<typeof useKibana>);

  return { getUrlForApp, get };
};

describe('useWorkflowOriginMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the live query has no workflow origin', () => {
    it('should return nothing when origin is missing', () => {
      mockServices();
      const { result } = renderHook(() => useWorkflowOriginMetadata(undefined));

      expect(result.current).toBeUndefined();
    });
  });

  describe('when a workflow run started the live query', () => {
    it('should link to the run in the Workflows Executions view', () => {
      const { getUrlForApp } = mockServices();
      const { result } = renderHook(() => useWorkflowOriginMetadata(WORKFLOW_ORIGIN));

      expect(getUrlForApp).toHaveBeenCalledWith('workflows', {
        path: '/executions?executionId=a4cfc2a2-48d3-47f4-a4f7-c71da8f8d488',
      });
      expect(result.current).toEqual({
        type: 'button',
        label: 'Started by a workflow run',
        href: '/app/workflows/executions?executionId=a4cfc2a2-48d3-47f4-a4f7-c71da8f8d488',
        'data-test-subj': 'liveQueryDetailsWorkflowRunLink',
      });
    });

    it('should URL-encode the run ID in the link', () => {
      const { getUrlForApp } = mockServices();
      renderHook(() =>
        useWorkflowOriginMetadata({ type: 'workflow', run_id: 'run:1.a', verified: false })
      );

      expect(getUrlForApp).toHaveBeenCalledWith('workflows', {
        path: '/executions?executionId=run%3A1.a',
      });
    });

    it('should show the run ID as text when the user cannot open the Workflows app', () => {
      const { getUrlForApp } = mockServices({ workflowsNavLink: false });
      const { result } = renderHook(() => useWorkflowOriginMetadata(WORKFLOW_ORIGIN));

      expect(getUrlForApp).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        type: 'text',
        label: 'Workflow run',
        value: 'a4cfc2a2-48d3-47f4-a4f7-c71da8f8d488',
        'data-test-subj': 'liveQueryDetailsWorkflowRun',
      });
    });

    it('should show the run ID as text when the Executions view is turned off', () => {
      mockServices({ executionsViewEnabled: false });
      const { result } = renderHook(() => useWorkflowOriginMetadata(WORKFLOW_ORIGIN));

      expect(result.current).toMatchObject({ type: 'text', value: WORKFLOW_ORIGIN?.run_id });
    });
  });
});
