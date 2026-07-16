/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import {
  ImportLifecycleFlyoutProvider,
  useImportLifecycleFlyoutContext,
} from './import_lifecycle_flyout_context';
import { useImportLifecycleFlyout } from './use_import_lifecycle_flyout';

const mockFetch = jest.fn();
const mockStreamsRepositoryClient = { fetch: mockFetch };
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockTrackRetentionChanged = jest.fn();
const mockGetIlmPolicies = jest.fn();

const mockKibana = {
  core: {
    application: { navigateToApp: jest.fn() },
    http: { get: mockGetIlmPolicies },
    notifications: {
      toasts: { addSuccess: mockAddSuccess, addError: mockAddError },
    },
  },
  dependencies: {
    start: {
      streams: { streamsRepositoryClient: mockStreamsRepositoryClient },
    },
  },
  services: { telemetryClient: { trackRetentionChanged: mockTrackRetentionChanged } },
  isServerless: false,
};

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: () => mockKibana,
}));

import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';

jest.mock('../../../../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: jest.fn(),
}));

const mockUseStreamsAppFetch = useStreamsAppFetch as jest.Mock;

const otherStream = {
  stream: { name: 'other-stream' },
  effective_lifecycle: { dsl: { data_retention: '7d' } },
  privileges: { read_failure_store: true },
} as unknown as ListStreamDetail;

const currentStream = {
  stream: { name: 'current-stream' },
  effective_lifecycle: { dsl: { data_retention: '30d' } },
  privileges: { read_failure_store: true },
} as unknown as ListStreamDetail;

const streamWithFailureStore = {
  stream: { name: 'with-failure-store' },
  effective_lifecycle: { dsl: { data_retention: '7d' } },
  effective_failure_store: {
    lifecycle: { enabled: { data_retention: '14d', is_default_retention: false } },
  },
  privileges: { read_failure_store: true },
} as unknown as ListStreamDetail;

const ilmStream = {
  stream: { name: 'ilm-stream' },
  effective_lifecycle: { ilm: { policy: 'hot-warm-policy' } },
  privileges: { read_failure_store: true },
} as unknown as ListStreamDetail;

const ilmStreamWithFailureStore = {
  stream: { name: 'ilm-stream-with-failure-store' },
  effective_lifecycle: { ilm: { policy: 'hot-warm-policy' } },
  effective_failure_store: {
    lifecycle: { enabled: { data_retention: '21d', is_default_retention: false } },
  },
  privileges: { read_failure_store: true },
} as unknown as ListStreamDetail;

const streamWithoutFailureStoreReadPrivilege = {
  stream: { name: 'without-failure-store-read' },
  effective_lifecycle: { dsl: { data_retention: '7d' } },
  privileges: { read_failure_store: false },
} as unknown as ListStreamDetail;

const ilmPolicyFromEs = {
  name: 'hot-warm-policy',
  policy: {
    name: 'hot-warm-policy',
    phases: { hot: {}, delete: { min_age: '30d', actions: { delete: {} } } },
  },
};

const definition = {
  stream: {
    name: 'current-stream',
    ingest: {
      lifecycle: { dsl: { data_retention: '30d' } },
      processing: { steps: [] },
    },
  },
  privileges: { lifecycle: true, manage_failure_store: true },
  effective_lifecycle: { dsl: { data_retention: '30d' } },
  index_mode: 'standard',
} as unknown as Streams.ingest.all.GetResponse;

describe('useImportLifecycleFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStreamsAppFetch.mockReturnValue({ value: [otherStream], loading: false });
    mockFetch.mockResolvedValue(undefined);
    mockGetIlmPolicies.mockReturnValue(new Promise(() => {}));
  });

  const renderImportFlyout = (
    refreshDefinition = jest.fn(),
    streamDefinition: Streams.ingest.all.GetResponse = definition
  ) =>
    renderHook(
      () => {
        const context = useImportLifecycleFlyoutContext()!;
        const importFlyout = useImportLifecycleFlyout({
          definition: streamDefinition,
          refreshDefinition,
        });
        return { context, importFlyout };
      },
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <ImportLifecycleFlyoutProvider>{children}</ImportLifecycleFlyoutProvider>
        ),
      }
    );

  // Reads the callbacks off the flyout element the hook returns, so tests don't
  // need to render the RetentionSelector picker. Only valid while the flyout is open.
  const getFlyoutProps = (result: {
    current: { importFlyout: { flyout: React.ReactElement | null } };
  }) => {
    const flyout = result.current.importFlyout.flyout;
    if (!flyout) {
      throw new Error('Expected the import flyout to be open');
    }
    const [importLifecycleFlyoutElement] = React.Children.toArray(flyout.props.children);
    return (importLifecycleFlyoutElement as React.ReactElement).props;
  };

  const getInspectFlyoutProps = (result: {
    current: { importFlyout: { flyout: React.ReactElement | null } };
  }) => {
    const flyout = result.current.importFlyout.flyout;
    if (!flyout) {
      throw new Error('Expected the import flyout to be open');
    }
    const [, inspectFlyoutElement] = React.Children.toArray(flyout.props.children);
    if (!inspectFlyoutElement) {
      throw new Error('Expected the inspect ILM policy flyout to be open');
    }
    return (inspectFlyoutElement as React.ReactElement).props;
  };

  it('reports whether there are streams available to import from', () => {
    const { result } = renderImportFlyout();

    expect(result.current.importFlyout.hasImportableStreams).toBe(true);
  });

  it('reports no importable streams when only the current stream is available', () => {
    mockUseStreamsAppFetch.mockReturnValue({ value: [currentStream], loading: false });

    const { result } = renderImportFlyout();

    act(() => {
      result.current.context.open();
    });

    expect(result.current.importFlyout.hasImportableStreams).toBe(false);
  });

  it('reports no importable streams when source failure store cannot be read', () => {
    mockUseStreamsAppFetch.mockReturnValue({
      value: [streamWithoutFailureStoreReadPrivilege],
      loading: false,
    });

    const { result } = renderImportFlyout();

    act(() => {
      result.current.context.open();
    });

    expect(result.current.importFlyout.hasImportableStreams).toBe(false);
    expect(getFlyoutProps(result).options).toEqual([]);
  });

  it('applies the selected stream lifecycle and closes on success', async () => {
    const refreshDefinition = jest.fn();
    const { result } = renderImportFlyout(refreshDefinition);

    await act(async () => {
      result.current.context.open();
    });

    act(() => {
      getFlyoutProps(result).onSelectOption('other-stream');
    });
    expect(result.current.importFlyout.previewLifecycle).toEqual({ dsl: { data_retention: '7d' } });

    act(() => {
      getFlyoutProps(result).onApply();
    });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith(
      'PUT /api/streams/{name}/_ingest 2023-10-31',
      expect.objectContaining({
        params: {
          path: { name: 'current-stream' },
          body: {
            ingest: expect.objectContaining({
              lifecycle: { dsl: { data_retention: '7d' } },
            }),
          },
        },
      })
    );
    expect(refreshDefinition).toHaveBeenCalled();
    expect(result.current.importFlyout.isOpen).toBe(false);
  });

  it('resets the selection each time the flyout is reopened', async () => {
    const { result } = renderImportFlyout();

    await act(async () => {
      result.current.context.open();
    });
    act(() => {
      getFlyoutProps(result).onSelectOption('other-stream');
    });
    expect(getFlyoutProps(result).selectedOptionName).toBe('other-stream');
    expect(result.current.importFlyout.previewLifecycle).toEqual({ dsl: { data_retention: '7d' } });

    act(() => {
      result.current.context.close();
    });
    expect(result.current.importFlyout.isOpen).toBe(false);

    await act(async () => {
      result.current.context.open();
    });

    expect(getFlyoutProps(result).selectedOptionName).toBeUndefined();
    expect(result.current.importFlyout.previewLifecycle).toBeNull();
  });

  it('fetches ILM policies at most once per open session', async () => {
    const { result } = renderImportFlyout();

    await act(async () => {
      result.current.context.open();
    });
    expect(mockGetIlmPolicies).toHaveBeenCalledTimes(1);

    // Re-renders while the flyout stays open must not trigger another fetch.
    act(() => {
      getFlyoutProps(result).onSelectOption('other-stream');
    });
    expect(mockGetIlmPolicies).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.context.close();
    });
    await act(async () => {
      result.current.context.open();
    });

    expect(mockGetIlmPolicies).toHaveBeenCalledTimes(2);
  });

  it('previews the inspected ILM policy while its sub-flyout is open, and reverts on close', async () => {
    mockUseStreamsAppFetch.mockReturnValue({ value: [otherStream, ilmStream], loading: false });
    mockGetIlmPolicies.mockResolvedValue([ilmPolicyFromEs]);

    const { result } = renderImportFlyout();

    await act(async () => {
      result.current.context.open();
    });
    await waitFor(() => expect(result.current.importFlyout.ilmPolicies).toHaveLength(1));

    act(() => {
      getFlyoutProps(result).onSelectOption('other-stream');
    });
    expect(result.current.importFlyout.previewLifecycle).toEqual({ dsl: { data_retention: '7d' } });

    act(() => {
      getFlyoutProps(result).onInspect('ilm-stream');
    });

    expect(result.current.importFlyout.previewLifecycle).toEqual({
      ilm: { policy: 'hot-warm-policy' },
    });
    expect(getFlyoutProps(result).selectedOptionName).toBe('other-stream');

    act(() => {
      getInspectFlyoutProps(result).onBack();
    });

    expect(result.current.importFlyout.previewLifecycle).toEqual({ dsl: { data_retention: '7d' } });
  });

  it('imports the inspected stream failure store when applying from the inspect flyout', async () => {
    mockUseStreamsAppFetch.mockReturnValue({
      value: [otherStream, ilmStreamWithFailureStore],
      loading: false,
    });
    mockGetIlmPolicies.mockResolvedValue([ilmPolicyFromEs]);

    const { result } = renderImportFlyout();

    await act(async () => {
      result.current.context.open();
    });
    await waitFor(() => expect(result.current.importFlyout.ilmPolicies).toHaveLength(1));

    act(() => {
      getFlyoutProps(result).onInspect('ilm-stream-with-failure-store');
    });

    expect(result.current.importFlyout.previewFailureStore).toEqual({
      lifecycle: { enabled: { data_retention: '21d', is_default_retention: false } },
    });

    act(() => {
      getInspectFlyoutProps(result).primaryAction.onClick();
    });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith(
      'PUT /api/streams/{name}/_ingest 2023-10-31',
      expect.objectContaining({
        params: expect.objectContaining({
          body: {
            ingest: expect.objectContaining({
              lifecycle: { ilm: { policy: 'hot-warm-policy' } },
              failure_store: { lifecycle: { enabled: { data_retention: '21d' } } },
            }),
          },
        }),
      })
    );
  });

  it('previews the selected stream failure store and imports it on apply', async () => {
    mockUseStreamsAppFetch.mockReturnValue({
      value: [otherStream, streamWithFailureStore],
      loading: false,
    });

    const { result } = renderImportFlyout();

    await act(async () => {
      result.current.context.open();
    });
    expect(result.current.importFlyout.previewFailureStore).toBeNull();

    act(() => {
      getFlyoutProps(result).onSelectOption('with-failure-store');
    });
    expect(result.current.importFlyout.previewFailureStore).toEqual({
      lifecycle: { enabled: { data_retention: '14d', is_default_retention: false } },
    });

    act(() => {
      getFlyoutProps(result).onApply();
    });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalled());

    // Both fields must land in the same PUT: sequential requests would revert
    // each other, since each spreads the pre-import `ingest`.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'PUT /api/streams/{name}/_ingest 2023-10-31',
      expect.objectContaining({
        params: expect.objectContaining({
          body: {
            ingest: expect.objectContaining({
              lifecycle: { dsl: { data_retention: '7d' } },
              failure_store: { lifecycle: { enabled: { data_retention: '14d' } } },
            }),
          },
        }),
      })
    );
  });

  it('disables apply when source failure store cannot be read', async () => {
    mockUseStreamsAppFetch.mockReturnValue({
      value: [otherStream, streamWithoutFailureStoreReadPrivilege],
      loading: false,
    });

    const { result } = renderImportFlyout();

    await act(async () => {
      result.current.context.open();
    });

    act(() => {
      getFlyoutProps(result).onSelectOption('without-failure-store-read');
    });

    expect(getFlyoutProps(result).isApplyDisabled).toBe(true);

    act(() => {
      getFlyoutProps(result).onApply();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not touch the failure store when the selected stream has none to import', async () => {
    const { result } = renderImportFlyout();

    await act(async () => {
      result.current.context.open();
    });
    act(() => {
      getFlyoutProps(result).onSelectOption('other-stream');
    });

    act(() => {
      getFlyoutProps(result).onApply();
    });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalled());

    const failureStoreCalls = mockFetch.mock.calls.filter(
      ([, options]) => options?.params?.body?.ingest?.failure_store !== undefined
    );
    expect(failureStoreCalls).toHaveLength(0);
  });
});
