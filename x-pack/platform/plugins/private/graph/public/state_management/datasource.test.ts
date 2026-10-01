/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedGraphEnvironment } from './mocks';
import { createMockGraphStore } from './mocks';
import type { AdvancedSettings, WorkspaceField } from '../types';
import { datasourceSelector, requestDatasource } from './datasource';
import { registerDatasourceListeners } from './datasource_listeners';
import { fieldsSelector } from './fields';
import { updateSettings } from './advanced_settings';
import { workspaceChanged, workspaceSelector, type WorkspaceSnapshot } from './workspace';
import type { DataView } from '@kbn/data-views-plugin/public';

const waitForPromise = () => new Promise((r) => setTimeout(r));

describe('datasource listener', () => {
  let env: MockedGraphEnvironment;

  beforeEach(() => {
    env = createMockGraphStore({
      listeners: [registerDatasourceListeners],
      mockedDepsOverwrites: {
        indexPatternProvider: {
          get: jest.fn(() =>
            Promise.resolve({
              title: 'test-pattern',
              getNonScriptedFields: () => [{ name: 'field1', type: 'string', isMapped: true }],
            } as DataView)
          ),
        },
      },
    });
  });

  function dispatchRequest() {
    env.store.dispatch(
      requestDatasource({ type: 'indexpattern', id: '123', title: 'test-pattern' })
    );
  }

  it('should load new data source and populate fields', async () => {
    dispatchRequest();
    await waitForPromise();
    const resultingState = env.store.getState();
    expect(env.mockedDeps.indexPatternProvider.get).toHaveBeenCalledWith('123');
    expect(fieldsSelector(resultingState)[0].name).toEqual('field1');
  });

  it('should clear Redux workspace state when switching datasource', async () => {
    const previousSnapshot: WorkspaceSnapshot = {
      isInitialized: true,
      isLayoutRunning: true,
      nodesById: {
        node: {
          id: 'node',
          x: 1,
          y: 1,
          label: 'node',
          color: 'black',
          scaledSize: 10,
          data: { field: 'field', term: 'term' },
        },
      },
      nodeIds: ['node'],
      edgesById: {
        edge: {
          id: 'edge',
          sourceId: 'node',
          targetId: 'node',
          topSourceId: 'node',
          topTargetId: 'node',
          label: 'edge',
          weight: 1,
          width: 1,
        },
      },
      edgeIds: ['edge'],
      selectedNodeIds: ['node'],
      selectedEdgeIds: ['edge'],
      blocklistedNodesById: {
        node: {
          id: 'node',
          x: 1,
          y: 1,
          label: 'node',
          color: 'black',
          scaledSize: 10,
          data: { field: 'field', term: 'term' },
        },
      },
      blocklistedNodeIds: ['node'],
    };
    env.store.dispatch(
      workspaceChanged({
        ...previousSnapshot,
        undoHistory: [previousSnapshot],
        redoHistory: [previousSnapshot],
      })
    );

    dispatchRequest();
    await waitForPromise();

    expect(workspaceSelector(env.store.getState())).toEqual({
      isInitialized: true,
      isLayoutRunning: false,
      nodesById: {},
      nodeIds: [],
      edgesById: {},
      edgeIds: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      blocklistedNodesById: {},
      blocklistedNodeIds: [],
      undoHistory: [],
      redoHistory: [],
    });
  });

  it('should initialize workspace with the current advanced settings', async () => {
    const newSettings = { timeoutMillis: 123 } as AdvancedSettings;
    env.store.dispatch(updateSettings(newSettings));
    dispatchRequest();
    await waitForPromise();
    expect(env.mockedDeps.createRuntimeGraph).toHaveBeenCalledWith();
  });

  it('should not carry over diversity field into new workspace', async () => {
    const newSettings = {
      timeoutMillis: 123,
      sampleDiversityField: { name: 'field1' } as WorkspaceField,
    } as AdvancedSettings;
    env.store.dispatch(updateSettings(newSettings));
    dispatchRequest();
    await waitForPromise();
    expect(env.mockedDeps.createRuntimeGraph).toHaveBeenCalledWith();
  });

  it('should discard a stale response when a newer datasource request finishes first', async () => {
    let resolveFirstRequest: (dataView: DataView) => void = () => {};
    const firstRequest = new Promise<DataView>((resolve) => {
      resolveFirstRequest = resolve;
    });
    const secondDataView = {
      title: 'second-pattern',
      getNonScriptedFields: () => [{ name: 'second-field', type: 'string', isMapped: true }],
    } as DataView;
    (env.mockedDeps.indexPatternProvider.get as jest.Mock)
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce(secondDataView);

    env.store.dispatch(
      requestDatasource({ type: 'indexpattern', id: 'first-id', title: 'first-pattern' })
    );
    env.store.dispatch(
      requestDatasource({ type: 'indexpattern', id: 'second-id', title: 'second-pattern' })
    );
    await waitForPromise();

    resolveFirstRequest({
      title: 'first-pattern',
      getNonScriptedFields: () => [{ name: 'first-field', type: 'string', isMapped: true }],
    } as DataView);
    await waitForPromise();

    expect(fieldsSelector(env.store.getState()).map(({ name }) => name)).toEqual(['second-field']);
    expect(env.mockedDeps.createRuntimeGraph).toHaveBeenCalledTimes(1);
    expect(env.mockedDeps.createRuntimeGraph).toHaveBeenCalledWith();
  });

  it('should error with a toast and abort if index pattern is not found', async () => {
    (env.mockedDeps.indexPatternProvider.get as jest.Mock).mockRejectedValueOnce(new Error());
    dispatchRequest();
    await waitForPromise();
    expect(env.mockedDeps.notifications.toasts.addDanger).toHaveBeenCalled();
    const resultingState = env.store.getState();
    expect(datasourceSelector(resultingState).current.type).toEqual('none');
  });
});
