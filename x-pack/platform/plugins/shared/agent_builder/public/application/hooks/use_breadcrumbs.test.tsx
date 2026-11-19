/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useBreadcrumb } from './use_breadcrumbs';

const mockSetBreadcrumbs = jest.fn();
const mockGetUrlForApp = jest.fn((appId: string, { path }: { path?: string } = {}) => {
  return `/app/${appId}${path ?? ''}`;
});

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      chrome: {
        setBreadcrumbs: mockSetBreadcrumbs,
      },
      application: {
        getUrlForApp: mockGetUrlForApp,
      },
    },
  }),
}));

describe('useBreadcrumb', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits a single root breadcrumb for the root page', () => {
    renderHook(() =>
      useBreadcrumb([
        {
          text: 'Conversations',
          path: '/',
        },
      ])
    );

    expect(mockSetBreadcrumbs).toHaveBeenCalledWith(
      [
        {
          text: 'Conversations',
          href: '/app/agent_builder/',
        },
      ],
      {
        project: {
          value: [
            {
              text: 'Conversations',
              href: '/app/agent_builder/',
            },
          ],
          absolute: true,
        },
      }
    );
  });

  it('prepends the Agent Builder breadcrumb for nested pages', () => {
    renderHook(() =>
      useBreadcrumb([
        {
          text: 'Agents',
          path: '/manage/agents',
        },
      ])
    );

    expect(mockSetBreadcrumbs).toHaveBeenCalledWith(
      [
        {
          text: 'Agent Builder',
          href: '/app/agent_builder',
        },
        {
          text: 'Agents',
          href: '/app/agent_builder/manage/agents',
        },
      ],
      {
        project: {
          value: [
            {
              text: 'Agent Builder',
              href: '/app/agent_builder',
            },
            {
              text: 'Agents',
              href: '/app/agent_builder/manage/agents',
            },
          ],
          absolute: true,
        },
      }
    );
  });

  it('keeps nested breadcrumb trails for deeper pages', () => {
    renderHook(() =>
      useBreadcrumb([
        {
          text: 'Agents',
          path: '/manage/agents',
        },
        {
          text: 'agent-123',
        },
      ])
    );

    expect(mockSetBreadcrumbs).toHaveBeenCalledWith(
      [
        {
          text: 'Agent Builder',
          href: '/app/agent_builder',
        },
        {
          text: 'Agents',
          href: '/app/agent_builder/manage/agents',
        },
        {
          text: 'agent-123',
          href: undefined,
        },
      ],
      {
        project: {
          value: [
            {
              text: 'Agent Builder',
              href: '/app/agent_builder',
            },
            {
              text: 'Agents',
              href: '/app/agent_builder/manage/agents',
            },
            {
              text: 'agent-123',
              href: undefined,
            },
          ],
          absolute: true,
        },
      }
    );
  });

  it('clears breadcrumbs on unmount', () => {
    const { unmount } = renderHook(() => useBreadcrumb([]));

    unmount();

    expect(mockSetBreadcrumbs).toHaveBeenLastCalledWith([]);
  });
});
