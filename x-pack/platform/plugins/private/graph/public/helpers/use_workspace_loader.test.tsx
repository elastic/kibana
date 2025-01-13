/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useWorkspaceLoader, UseWorkspaceLoaderProps } from './use_workspace_loader';
import { coreMock } from '@kbn/core/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { createMockGraphStore } from '../state_management/mocks';
import { Workspace } from '../types';
import { renderHook, waitFor } from '@testing-library/react';
import { ContentClient } from '@kbn/content-management-plugin/public';

jest.mock('react-router-dom', () => {
  const useLocation = () => ({
    search: '?query={}',
  });

  const replaceFn = jest.fn();

  const useHistory = () => ({
    replace: replaceFn,
  });
  return {
    useHistory,
    useLocation,
    useParams: () => ({
      id: '1',
    }),
  };
});

const mockContentClient = {
  get: jest.fn().mockResolvedValue({
    item: { id: 10, _version: '7.15.0', attributes: { wsState: '{}' } },
    meta: { outcome: 'exactMatch' },
  }),
  search: jest.fn().mockResolvedValue({ title: 'test', perPage: 1, total: 1, page: 1 }),
} as unknown as ContentClient;

describe('use_workspace_loader', () => {
  const defaultProps: UseWorkspaceLoaderProps = {
    workspaceRef: { current: {} as Workspace },
    store: createMockGraphStore({}).store,
    contentClient: mockContentClient as unknown as ContentClient,
    coreStart: coreMock.createStart(),
    spaces: spacesPluginMock.createStartContract(),
    data: dataPluginMock.createStartContract(),
  };

  it('should not redirect if outcome is exactMatch', async () => {
    renderHook((props) => useWorkspaceLoader(props), {
      initialProps: defaultProps,
    });

    await waitFor(() => {
      expect(defaultProps.spaces?.ui.redirectLegacyUrl).not.toHaveBeenCalled();
      expect(defaultProps.store.dispatch).toHaveBeenCalled();
    });
  });

  it('should redirect if outcome is aliasMatch', async () => {
    const props = {
      ...defaultProps,
      spaces: spacesPluginMock.createStartContract(),
      contentClient: {
        ...mockContentClient,
        get: jest.fn().mockResolvedValue({
          item: { id: 10, _version: '7.15.0', attributes: { wsState: '{}' } },
          meta: {
            outcome: 'aliasMatch',
            aliasTargetId: 'aliasTargetId',
            aliasPurpose: 'savedObjectConversion',
          },
        }),
      },
    } as unknown as UseWorkspaceLoaderProps;

    renderHook((_props) => useWorkspaceLoader(_props), {
      initialProps: props,
    });

    await waitFor(() =>
      expect(props.spaces?.ui.redirectLegacyUrl).toHaveBeenCalledWith({
        path: '#/workspace/aliasTargetId?query={}',
        aliasPurpose: 'savedObjectConversion',
        objectNoun: 'Graph',
      })
    );
  });
});
