/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { StreamDetailGeneralData } from '.';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import type { Streams } from '@kbn/streams-schema';
import type { useDataStreamStats } from '../hooks/use_data_stream_stats';
import type { StreamLifecycleFlyoutId } from '../common/hooks/lifecycle_flyout_coordination';
import {
  LifecycleFlyoutCoordinationProvider,
  STREAM_LIFECYCLE_FLYOUT_IDS,
  useLifecycleFlyoutCoordination,
  useRegisterLifecycleFlyoutOpen,
} from '../common/hooks/lifecycle_flyout_coordination';

let mockFlyoutOpen = false;
let mockFlyoutHasUnsavedChanges = false;

interface MockLifecycleSummaryProps {
  onFlyoutOpenChange?: (isOpen: boolean) => void;
  onFlyoutUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
  onAddDeletePhase?: () => void;
}

let mockLifecycleSummaryProps: MockLifecycleSummaryProps | undefined;

vi.mock('../../../../../hooks/use_streams_privileges', () => {
  const mocked = {
    useStreamsPrivileges: vi.fn(() => ({ features: { canvas: { enabled: false } } })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/unsaved-changes-prompt', () => {
  const mocked = {
    useUnsavedChangesPrompt: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../hooks/use_kibana', () => {
  const mocked = {
    useKibana: () => ({
      core: {
        notifications: { toasts: { addSuccess: vi.fn(), addError: vi.fn() } },
        http: {},
        overlays: { openConfirm: vi.fn() },
        application: { navigateToUrl: vi.fn() },
      },
      appParams: { history: {} },
      dependencies: {
        start: {
          streams: {
            streamsRepositoryClient: { fetch: vi.fn() },
          },
          share: {
            url: {
              locators: {
                get: vi.fn(() => ({
                  getUrl: vi.fn(async () => '/mock-index-template-url'),
                })),
              },
            },
          },
        },
      },
      services: { telemetryClient: { trackRetentionChanged: vi.fn() } },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../hooks/use_streams_app_router', () => {
  const mocked = {
    useStreamsAppRouter: () => ({ link: vi.fn(() => '/mock-router-link') }),
  };
  return { ...mocked, default: mocked };
});

// The frozen-phase gating hook reaches into licensing/cloud/application; this test focuses on the
// unsaved-changes prompt wiring, so stub it out with non-gating defaults.
vi.mock('../hooks/use_dlm_frozen_phase_gating', () => {
  const mocked = {
    useDlmFrozenPhaseGating: () => ({
      excludeFrozen: false,
      addPhaseBadges: {
        showEnterpriseLicenseRequiredBadge: false,
        showDefaultRepositoryRequiredBadge: false,
      },
      flyoutProps: {
        isMissingEnterpriseLicense: false,
        onUpgradeEnterprise: vi.fn(),
        onRefreshDefaultRepository: vi.fn(),
        isRefreshingDefaultRepository: false,
        manageRepositoriesHref: '/mock-repositories',
        defaultRepositoryName: undefined,
      },
      handleAddPhaseGating: () => false,
      modals: null,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../hooks/use_timefilter', () => {
  const mocked = {
    useTimefilter: () => ({
      timeState: {},
      timeState$: { subscribe: () => ({ unsubscribe: () => {} }) },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/react-hooks', () => {
  const mocked = {
    useAbortController: () => ({ signal: undefined }),
    useAbortableAsync: () => ({
      value: undefined,
      loading: false,
      error: undefined,
      refresh: () => {},
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../common/section_panel', () => {
  const mocked = {
    SectionPanel: ({
      children,
      topCard,
      bottomCard,
    }: {
      children: React.ReactNode;
      topCard?: React.ReactNode;
      bottomCard?: React.ReactNode;
    }) => (
      <div>
        {topCard}
        {children}
        {bottomCard}
      </div>
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./cards/retention_card', () => {
  const mocked = {
    RetentionCard: () => <div data-test-subj="retentionCard" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./cards/storage_size_card', () => {
  const mocked = {
    StorageSizeCard: () => <div data-test-subj="storageSizeCard" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./cards/ingestion_card', () => {
  const mocked = {
    IngestionCard: () => <div data-test-subj="ingestionCard" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./ingestion_rate', () => {
  const mocked = {
    IngestionRate: () => <div data-test-subj="ingestionRate" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./lifecycle_summary', () => {
  const mocked = {
    LifecycleSummary: async ({ onAddDeletePhase }: { onAddDeletePhase?: () => void }) => {
      // Keep this unit test focused on StreamDetailGeneralData + unsaved prompt wiring.
      // We emulate the lifecycle flyout updating the shared preview state.
      const { useLifecyclePreview } = (await vi.importActual(
        '../common/hooks/lifecycle_preview'
      )) as typeof import('../common/hooks/lifecycle_preview');
      const preview = useLifecyclePreview();

      mockLifecycleSummaryProps = {
        onFlyoutOpenChange: (isOpen: boolean) => {
          preview.setIsActive(isOpen);
          if (!isOpen) {
            preview.setHasUnsavedChanges(false);
          }
        },
        onFlyoutUnsavedChangesChange: (hasUnsavedChanges: boolean) => {
          preview.setHasUnsavedChanges(hasUnsavedChanges);
        },
        onAddDeletePhase,
      };

      return <div data-test-subj="mockLifecycleSummary" />;
    },
  };
  return { ...mocked, default: mocked };
});

const mockUseUnsavedChangesPrompt = useUnsavedChangesPrompt as unknown as Mock;

const getPromptHasUnsavedChanges = (): boolean => {
  const lastCall = mockUseUnsavedChangesPrompt.mock.calls.at(-1)?.[0];
  return Boolean(lastCall?.hasUnsavedChanges);
};

describe('StreamDetailGeneralData unsaved changes prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlyoutOpen = false;
    mockFlyoutHasUnsavedChanges = false;
    mockLifecycleSummaryProps = undefined;
  });

  const definition = {
    stream: {
      name: 'test-stream',
      ingest: { lifecycle: { inherit: {} }, processing: { steps: [], updated_at: '2023-10-31' } },
    },
    privileges: { lifecycle: true, monitor: true, create_snapshot_repository: false },
    effective_lifecycle: { ilm: { policy: 'test-policy' } },
  } as unknown as Streams.ingest.all.GetResponse;

  const data: ReturnType<typeof useDataStreamStats> = {
    stats: undefined,
    error: undefined,
    isLoading: false,
    refresh: vi.fn(),
    timeSeriesCountLoading: false,
    timeSeriesCountError: undefined,
  };

  // StreamDetailGeneralData is normally rendered under stream_detail_lifecycle/index.tsx's
  // LifecycleFlyoutCoordinationProvider; render it standalone here with the same wrapper.
  const renderComponent = (extraSiblings?: React.ReactNode) =>
    render(
      <LifecycleFlyoutCoordinationProvider>
        <StreamDetailGeneralData definition={definition} refreshDefinition={vi.fn()} data={data} />
        {extraSiblings}
      </LifecycleFlyoutCoordinationProvider>
    );

  it('does not mark unsaved changes just because flyout is open', async () => {
    mockFlyoutOpen = true;
    mockFlyoutHasUnsavedChanges = false;

    renderComponent();

    act(() => {
      mockLifecycleSummaryProps?.onFlyoutOpenChange?.(mockFlyoutOpen);
      mockLifecycleSummaryProps?.onFlyoutUnsavedChangesChange?.(mockFlyoutHasUnsavedChanges);
    });

    await waitFor(() => {
      expect(getPromptHasUnsavedChanges()).toBe(false);
    });
  });

  it('marks unsaved changes when flyout reports edits', async () => {
    mockFlyoutOpen = true;
    mockFlyoutHasUnsavedChanges = true;

    renderComponent();

    act(() => {
      mockLifecycleSummaryProps?.onFlyoutOpenChange?.(mockFlyoutOpen);
      mockLifecycleSummaryProps?.onFlyoutUnsavedChangesChange?.(mockFlyoutHasUnsavedChanges);
    });

    await waitFor(() => {
      expect(getPromptHasUnsavedChanges()).toBe(true);
    });
  });

  describe('delete phase flyout coordination', () => {
    // Registers an arbitrary flyout as open in the shared registry, the way a sibling lifecycle
    // flyout owner (e.g. the successful-lifecycle-method flyout) would.
    const FlyoutRegistrant = ({ id, isOpen }: { id: StreamLifecycleFlyoutId; isOpen: boolean }) => {
      useRegisterLifecycleFlyoutOpen(id, isOpen);
      return null;
    };

    // Checks blocking from a *different* flyout's perspective (e.g. the data-phases flyout,
    // which would need to stay closed while the delete-phase flyout is open).
    const OtherFlyoutBlockedProbe = () => {
      const { isAnyOtherFlyoutOpen } = useLifecycleFlyoutCoordination();
      return (
        <div data-test-subj="isBlockedBySuccessfulDeletePhase">
          {String(isAnyOtherFlyoutOpen(STREAM_LIFECYCLE_FLYOUT_IDS.dataPhases))}
        </div>
      );
    };

    it('opens the delete-phase flyout when nothing else is open', async () => {
      const { queryByTestId, getByTestId } = renderComponent();

      expect(queryByTestId('streamsEditSuccessfulDeletePhaseFlyout')).not.toBeInTheDocument();

      act(() => {
        mockLifecycleSummaryProps?.onAddDeletePhase?.();
      });

      await waitFor(() => {
        expect(getByTestId('streamsEditSuccessfulDeletePhaseFlyout')).toBeInTheDocument();
      });
    });

    it('does not open the delete-phase flyout while another lifecycle flyout is already open', () => {
      const { queryByTestId } = renderComponent(
        <FlyoutRegistrant id={STREAM_LIFECYCLE_FLYOUT_IDS.successfulLifecycle} isOpen />
      );

      act(() => {
        mockLifecycleSummaryProps?.onAddDeletePhase?.();
      });

      expect(queryByTestId('streamsEditSuccessfulDeletePhaseFlyout')).not.toBeInTheDocument();
    });

    it('registers itself as open once opened, blocking other lifecycle flyouts', async () => {
      const { getByTestId } = renderComponent(<OtherFlyoutBlockedProbe />);

      expect(getByTestId('isBlockedBySuccessfulDeletePhase')).toHaveTextContent('false');

      act(() => {
        mockLifecycleSummaryProps?.onAddDeletePhase?.();
      });

      await waitFor(() => {
        expect(getByTestId('isBlockedBySuccessfulDeletePhase')).toHaveTextContent('true');
      });
    });
  });
});
