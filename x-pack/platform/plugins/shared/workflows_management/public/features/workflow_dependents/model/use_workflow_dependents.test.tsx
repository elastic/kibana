/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { useWorkflowDependents } from './use_workflow_dependents';
import type { WorkflowDependentsImpactResponse } from '../../../../common/lib/workflow_dependents/api';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { createStartServicesMock } from '../../../mocks';
import { TestProvider } from '../../../shared/mocks/test_providers';

const SAVED_YAML = 'name: Alert context\nsteps: []';
const CALLING_YAML = `name: Alert context
steps:
  - name: enrich
    type: workflow.execute
    with:
      workflow-id: enrichment`;
// Longer than the draft debounce.
const DEBOUNCED = { timeout: 3000 };

const response: WorkflowDependentsImpactResponse = {
  analysis: {
    contractChanges: [],
    dependents: [],
    summary: { direct: 0, breaking: 0, warning: 0, unknown: 0, indirectBreaking: 0 },
  },
  calledWorkflows: [],
};

describe('useWorkflowDependents', () => {
  const setup = (
    mockPost: (services: ReturnType<typeof createStartServicesMock>) => void,
    draftYaml = `${SAVED_YAML}\ndescription: first`
  ) => {
    const services = createStartServicesMock();
    mockPost(services);
    const store = createMockStore();
    store.dispatch(
      setWorkflow({
        id: 'alert-context',
        name: 'Alert context',
        enabled: true,
        yaml: SAVED_YAML,
        lastUpdatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        definition: null,
        valid: true,
      })
    );
    store.dispatch(setYamlString(draftYaml));
    const wrapper = ({ children }: PropsWithChildren) => (
      <TestProvider services={services} store={store}>
        {children}
      </TestProvider>
    );
    return { services, store, ...renderHook(() => useWorkflowDependents(), { wrapper }) };
  };

  it('marks the results as updating while a newer draft is checked, and as failed if that fails', async () => {
    let rejectRefresh: (error: Error) => void = () => {};
    const { services, store, result } = setup(({ http }) => {
      http.post.mockResolvedValueOnce(response).mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectRefresh = reject;
          })
      );
    });

    await waitFor(() => expect(result.current.analysis).toBeDefined());
    expect(result.current).toMatchObject({ isUpdating: false, isRefreshError: false });

    act(() => {
      store.dispatch(setYamlString(`${SAVED_YAML}\ndescription: second`));
    });
    expect(result.current).toMatchObject({ isUpdating: true, analysis: response.analysis });

    await waitFor(() => expect(services.http.post).toHaveBeenCalledTimes(2), DEBOUNCED);
    act(() => rejectRefresh(new Error('Bad YAML')));

    await waitFor(() => expect(result.current.isRefreshError).toBe(true));
    expect(result.current).toMatchObject({
      isUpdating: false,
      isError: false,
      analysis: response.analysis,
    });
  });

  it('never shows the analysis of the workflow opened before', async () => {
    let rejectOther: (error: Error) => void = () => {};
    const { services, store, result } = setup(({ http }) => {
      http.post.mockResolvedValueOnce(response).mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectOther = reject;
          })
      );
    });
    await waitFor(() => expect(result.current.analysis).toBeDefined());

    act(() => {
      store.dispatch(
        setWorkflow({
          id: 'other',
          name: 'Other',
          enabled: true,
          yaml: SAVED_YAML,
          lastUpdatedAt: '2024-02-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'test-user',
          lastUpdatedBy: 'test-user',
          definition: null,
          valid: true,
        })
      );
    });
    expect(result.current).toMatchObject({ analysis: undefined, isLoading: true });

    await waitFor(() => expect(services.http.post).toHaveBeenCalledTimes(2));
    act(() => rejectOther(new Error('Server error')));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current).toMatchObject({ analysis: undefined, isRefreshError: false });
  });

  describe('when nothing runs the workflow and it runs nothing', () => {
    const sending = (body: Record<string, unknown>) =>
      [expect.any(String), expect.objectContaining({ body: JSON.stringify(body) })] as const;

    it('checks no draft until the draft runs a workflow', async () => {
      const { services, store, result } = setup(({ http }) => {
        http.post.mockResolvedValue(response);
      }, SAVED_YAML);
      await waitFor(() => expect(result.current.analysis).toBeDefined());

      act(() => {
        store.dispatch(setYamlString(`${SAVED_YAML}\ndescription: second`));
      });
      expect(result.current.isUpdating).toBe(true);
      await waitFor(() => expect(result.current.isUpdating).toBe(false), DEBOUNCED);
      expect(services.http.post).toHaveBeenCalledTimes(1);
      expect(services.http.post).toHaveBeenCalledWith(...sending({}));

      act(() => {
        store.dispatch(setYamlString(CALLING_YAML));
      });
      await waitFor(() => expect(services.http.post).toHaveBeenCalledTimes(2), DEBOUNCED);
      expect(services.http.post).toHaveBeenLastCalledWith(...sending({ yaml: CALLING_YAML }));
    });

    it('checks a draft with an unresolved alias instead of throwing', async () => {
      const aliasYaml = `${SAVED_YAML}\nconsts:\n  message: *not_defined_yet`;
      const { services, store, result } = setup(({ http }) => {
        http.post.mockResolvedValue(response);
      }, SAVED_YAML);
      await waitFor(() => expect(result.current.analysis).toBeDefined());

      act(() => {
        store.dispatch(setYamlString(aliasYaml));
      });
      await waitFor(() => expect(services.http.post).toHaveBeenCalledTimes(2), DEBOUNCED);
      expect(services.http.post).toHaveBeenLastCalledWith(...sending({ yaml: aliasYaml }));
      expect(result.current.analysis).toEqual(response.analysis);
    });

    it('checks drafts once the saved version runs a workflow', async () => {
      const { services, store, result } = setup(({ http }) => {
        http.post.mockResolvedValue({
          ...response,
          calledWorkflows: [
            { workflowId: 'enrichment', status: 'safe', callSites: [], issues: [] },
          ],
        });
      }, SAVED_YAML);
      await waitFor(() => expect(result.current.analysis).toBeDefined());

      act(() => {
        store.dispatch(setYamlString(`${SAVED_YAML}\ndescription: second`));
      });
      await waitFor(() => expect(services.http.post).toHaveBeenCalledTimes(2), DEBOUNCED);
      expect(services.http.post).toHaveBeenLastCalledWith(
        ...sending({ yaml: `${SAVED_YAML}\ndescription: second` })
      );
    });
  });
});
