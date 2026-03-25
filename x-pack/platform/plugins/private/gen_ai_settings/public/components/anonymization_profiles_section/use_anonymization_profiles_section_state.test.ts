/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { useAnonymizationProfilesSectionState } from './use_anonymization_profiles_section_state';

jest.mock('@kbn/spaces-utils', () => ({
  getSpaceIdFromPath: jest.fn(),
}));

const setupServices = () => {
  const addSuccess = jest.fn();
  const addWarning = jest.fn();
  const addError = jest.fn();
  const fetch = jest.fn();
  const post = jest.fn();

  return {
    services: {
      application: {
        capabilities: {
          anonymization: {
            show: true,
            manage: true,
          },
        },
      },
      http: {
        basePath: {
          get: jest.fn().mockReturnValue('/s/space-a/app/management'),
          serverBasePath: '/s/space-a',
        },
        fetch,
        post,
      },
      notifications: {
        toasts: {
          addSuccess,
          addWarning,
          addError,
        },
      },
    },
    addSuccess,
    addWarning,
    addError,
    fetch,
    post,
  };
};

describe('useAnonymizationProfilesSectionState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('derives active space id and capabilities', () => {
    jest.mocked(getSpaceIdFromPath).mockReturnValue({
      spaceId: 'space-a',
      pathHasExplicitSpaceIdentifier: true,
    });
    const { services } = setupServices();

    const { result } = renderHook(() =>
      useAnonymizationProfilesSectionState({
        services: services as never,
      })
    );

    expect(result.current.activeSpaceId).toBe('space-a');
    expect(result.current.canShow).toBe(true);
    expect(result.current.canManage).toBe(true);
  });

  it('uses parser default space and hidden capabilities when capability shape is invalid', () => {
    jest.mocked(getSpaceIdFromPath).mockReturnValue({
      spaceId: 'default',
      pathHasExplicitSpaceIdentifier: false,
    });
    const { services } = setupServices();
    services.application.capabilities.anonymization = {} as never;

    const { result } = renderHook(() =>
      useAnonymizationProfilesSectionState({
        services: services as never,
      })
    );

    expect(result.current.activeSpaceId).toBe('default');
    expect(result.current.canShow).toBe(false);
    expect(result.current.canManage).toBe(false);
  });

  it('resolves data view title and loads preview document source', async () => {
    jest.mocked(getSpaceIdFromPath).mockReturnValue({
      spaceId: 'space-a',
      pathHasExplicitSpaceIdentifier: true,
    });
    const { services, fetch, post } = setupServices();
    fetch.mockResolvedValue({ data_view: { title: 'logs-*' } });
    post.mockResolvedValue({
      rawResponse: {
        hits: {
          hits: [{ _source: { host: { name: 'web-1' } } }],
        },
      },
    });

    const { result } = renderHook(() =>
      useAnonymizationProfilesSectionState({
        services: services as never,
      })
    );

    const previewDocument = await result.current.fetchPreviewDocument({
      targetType: 'data_view',
      targetId: 'dv-1',
    });

    expect(fetch).toHaveBeenCalledWith('/api/data_views/data_view/dv-1');
    expect(post).toHaveBeenCalled();
    expect(previewDocument).toEqual({ host: { name: 'web-1' } });
  });

  it('shows success/warning/error toasts via callback handlers', () => {
    jest.mocked(getSpaceIdFromPath).mockReturnValue({
      spaceId: 'space-a',
      pathHasExplicitSpaceIdentifier: true,
    });
    const { services, addSuccess, addWarning, addError } = setupServices();

    const { result } = renderHook(() =>
      useAnonymizationProfilesSectionState({
        services: services as never,
      })
    );

    result.current.onCreateSuccess();
    result.current.onUpdateSuccess();
    result.current.onDeleteSuccess();
    result.current.onCreateConflict();
    result.current.onOpenConflictError(new Error('boom'));

    expect(addSuccess).toHaveBeenCalledTimes(3);
    expect(addWarning).toHaveBeenCalledTimes(1);
    expect(addError).toHaveBeenCalledTimes(1);
  });
});
