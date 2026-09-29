/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { render, screen, act } from '@testing-library/react';
import { ChatEventType, TimelineEventType } from '@kbn/agent-builder-common';
import { customContentEmbeddableFactory } from './custom_content_embeddable';
import type { CustomContentApi } from './custom_content_embeddable';
import type { CustomContentEmbeddableState } from '../server';
import { readEsqlQuery } from '@kbn/custom-content-common';
import { CUSTOM_CONTENT_UPDATED_UI_EVENT } from '../common/ui_events';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';
import type { openLazyFlyout } from '@kbn/presentation-util';
import type { EditCustomContentFlyoutProps } from './components/edit_custom_content_flyout';

jest.mock('@kbn/presentation-publishing', () => {
  const actual = jest.requireActual('@kbn/presentation-publishing');
  return { ...actual, apiIsPresentationContainer: jest.fn(() => false) };
});

const mockApiIsPresentationContainer = apiIsPresentationContainer as jest.MockedFunction<
  typeof apiIsPresentationContainer
>;

let capturedComponentProps:
  | {
      isGenerating?: boolean;
      onGenerateWithChat?: () => void;
      onLoadingChange?: (isLoading: boolean) => void;
    }
  | undefined;

jest.mock('@kbn/custom-content-renderer', () => ({
  CustomContentComponent: (props: {
    esqlQuery: string | undefined;
    savedTemplate: string | undefined;
    generationVersion: number;
    timeRange: { from: string; to: string } | undefined;
    isGenerating?: boolean;
    onLoadingChange: (isLoading: boolean) => void;
    onGenerateWithChat?: () => void;
  }) => {
    capturedComponentProps = props;
    return (
      <div
        data-test-subj="mockCustomContentComponent"
        data-esql-query={props.esqlQuery ?? ''}
        data-saved-template={props.savedTemplate ?? ''}
        data-generation-version={props.generationVersion}
        data-time-range={props.timeRange ? `${props.timeRange.from}/${props.timeRange.to}` : ''}
        data-is-generating={String(Boolean(props.isGenerating))}
      />
    );
  },
}));

let capturedFlyoutProps:
  | {
      onSave: (esqlQuery: string | undefined, template: string | undefined) => void;
      onClose: () => void;
      onGenerateWithChat?: (template: string, esqlQuery: string | undefined) => void;
    }
  | undefined;

jest.mock('./components/edit_custom_content_flyout', () => ({
  EditCustomContentFlyout: (props: EditCustomContentFlyoutProps) => {
    capturedFlyoutProps = props;
    return <div data-test-subj="mockEditCustomContentFlyout" />;
  },
}));

type LoadContentFn = (args: {
  closeFlyout: () => void;
  ariaLabelledBy: string;
}) => Promise<React.JSX.Element | null | void>;

let capturedOpenLazyFlyoutArgs:
  | { loadContent: LoadContentFn; flyoutProps?: { focusedPanelId?: string } }
  | undefined;
let mockFlyoutClose: () => void = () => {};
let mockFlyoutOnClose: Promise<void> = Promise.resolve();

jest.mock('@kbn/presentation-util', () => ({
  openLazyFlyout: (args: Parameters<typeof openLazyFlyout>[0]) => {
    capturedOpenLazyFlyoutArgs = args;
    let resolve: () => void;
    mockFlyoutOnClose = new Promise<void>((r) => {
      resolve = r;
    });
    mockFlyoutClose = () => resolve();
    return { onClose: mockFlyoutOnClose, close: mockFlyoutClose };
  },
  tracksOverlays: (api: unknown) =>
    !!api &&
    typeof (api as Record<string, unknown>).clearOverlays === 'function' &&
    typeof (api as Record<string, unknown>).openOverlay === 'function',
}));

let mockAgentBuilder: unknown;

const mockTelemetry = {
  trackPanelAdded: jest.fn(),
  trackEditFlyoutOpened: jest.fn(),
  trackPanelSaved: jest.fn(),
  trackEditCancelled: jest.fn(),
  trackGenerateWithChatClicked: jest.fn(),
  trackAgentUpdateApplied: jest.fn(),
};

jest.mock('./telemetry', () => ({ getTelemetry: () => mockTelemetry }));

jest.mock('./services', () => ({
  getServices: () => ({
    agentBuilder: mockAgentBuilder,
    core: { http: {} },
    search: jest.fn(),
  }),
}));

const baseState: CustomContentEmbeddableState = {
  esql_query: ['FROM logs | STATS count = COUNT(*)'],
  template: '<div>static html</div>',
};

const buildEmbeddable = async (
  initialState: CustomContentEmbeddableState,
  parentApi: Record<string, unknown> = {}
) => {
  const uuid = 'test-uuid';

  const embeddable = await customContentEmbeddableFactory.buildEmbeddable({
    initializeDrilldownsManager: jest.fn(),
    initialState,
    parentApi,
    finalizeApi: (api) => ({ ...api, uuid, parentApi } as unknown as CustomContentApi),
    uuid,
  });

  return { embeddable };
};

describe('customContentEmbeddableFactory', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockAgentBuilder = undefined;
    capturedComponentProps = undefined;
    capturedFlyoutProps = undefined;
    capturedOpenLazyFlyoutArgs = undefined;
    mockApiIsPresentationContainer.mockReturnValue(false);
  });

  const renderFlyoutContent = async () => {
    const content = await capturedOpenLazyFlyoutArgs!.loadContent({
      closeFlyout: mockFlyoutClose,
      ariaLabelledBy: 'test-aria',
    });
    if (content) act(() => render(content as React.ReactElement));
  };

  const closeFlyout = async () => {
    act(() => mockFlyoutClose());
    await act(async () => {
      await mockFlyoutOnClose;
    });
  };

  describe('serializeState', () => {
    it('round-trips esqlQuery and template from initial state', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      expect(embeddable.api.serializeState()).toEqual(baseState);
    });

    it('reflects updates applied via applySerializedState', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const nextState: CustomContentEmbeddableState = {
        template: '<div>new</div>',
      };

      act(() => {
        embeddable.api.applySerializedState(nextState);
      });

      expect(embeddable.api.serializeState()).toEqual(nextState);
    });

    it('serializes template as undefined when not provided', async () => {
      const { embeddable } = await buildEmbeddable({ template: undefined });
      expect(embeddable.api.serializeState().template).toBeUndefined();
    });

    it('reflects esqlQuery update applied via applySerializedState', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      act(() => {
        embeddable.api.applySerializedState({
          ...baseState,
          esql_query: ['FROM metrics | STATS avg = AVG(value)'],
        });
      });
      expect(readEsqlQuery(embeddable.api.serializeState())).toBe(
        'FROM metrics | STATS avg = AVG(value)'
      );
    });
  });

  describe('per-panel time range', () => {
    const panelRange = { from: '2026-01-01T00:00:00Z', to: '2026-01-02T00:00:00Z' };
    const dashboardRange = { from: 'now-15m', to: 'now' };
    const parentWithTime = { timeRange$: new BehaviorSubject(dashboardRange) };

    // Publishing timeRange$ is what makes the platform's "Customize time range" action appear,
    // so dropping the manager spread would silently remove the feature.
    it('publishes a writable time range on the api', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      expect(embeddable.api.timeRange$).toBeDefined();
      expect(typeof embeddable.api.setTimeRange).toBe('function');
    });

    it('round-trips time_range through serializeState', async () => {
      const { embeddable } = await buildEmbeddable({ ...baseState, time_range: panelRange });
      expect(embeddable.api.serializeState().time_range).toEqual(panelRange);
    });

    it('renders with the panel override rather than the dashboard range', async () => {
      const { embeddable } = await buildEmbeddable(
        { ...baseState, time_range: panelRange },
        parentWithTime
      );
      await act(async () => render(<embeddable.Component />));

      expect(screen.getByTestId('mockCustomContentComponent')).toHaveAttribute(
        'data-time-range',
        `${panelRange.from}/${panelRange.to}`
      );
    });

    it('falls back to the dashboard range when the panel has no override', async () => {
      const { embeddable } = await buildEmbeddable(baseState, parentWithTime);
      await act(async () => render(<embeddable.Component />));

      expect(screen.getByTestId('mockCustomContentComponent')).toHaveAttribute(
        'data-time-range',
        `${dashboardRange.from}/${dashboardRange.to}`
      );
    });
  });

  // Screenshotting marks a panel render-complete as soon as `dataLoading$` is falsy, so reporting
  // would capture an empty panel if this defaulted to false.
  describe('dataLoading$', () => {
    it('starts loading before the first fetch resolves', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      expect(embeddable.api.dataLoading$.getValue()).toBe(true);
    });

    it('follows the rendered content loading state', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      await act(async () => capturedComponentProps?.onLoadingChange?.(false));
      expect(embeddable.api.dataLoading$.getValue()).toBe(false);

      await act(async () => capturedComponentProps?.onLoadingChange?.(true));
      expect(embeddable.api.dataLoading$.getValue()).toBe(true);
    });
  });

  describe('anyStateChange$', () => {
    it('does not emit on initial subscribe', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const listener = jest.fn();
      embeddable.api.anyStateChange$.subscribe(listener);
      expect(listener).not.toHaveBeenCalled();
    });

    it('emits when esqlQuery changes via applySerializedState', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const listener = jest.fn();
      embeddable.api.anyStateChange$.subscribe(listener);

      act(() => {
        embeddable.api.applySerializedState({
          ...baseState,
          esql_query: ['FROM metrics | LIMIT 10'],
        });
      });

      expect(listener).toHaveBeenCalled();
    });

    it('emits when template changes via applySerializedState', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const listener = jest.fn();
      embeddable.api.anyStateChange$.subscribe(listener);

      act(() => {
        embeddable.api.applySerializedState({ ...baseState, template: 'changed' });
      });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Component', () => {
    it('passes esqlQuery and savedTemplate to CustomContentComponent', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      const el = screen.getByTestId('mockCustomContentComponent');
      expect(el).toHaveAttribute('data-esql-query', readEsqlQuery(baseState));
      expect(el).toHaveAttribute('data-saved-template', '<div>static html</div>');
    });
  });

  describe('flyout integration', () => {
    it('`onEdit` calls openLazyFlyout with focusedPanelId and renders the flyout', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      expect(capturedOpenLazyFlyoutArgs).toBeUndefined();

      await act(async () => embeddable.api.onEdit());
      expect(capturedOpenLazyFlyoutArgs?.flyoutProps?.focusedPanelId).toBe('test-uuid');
      expect(mockTelemetry.trackEditFlyoutOpened).toHaveBeenCalledWith({
        isNewPanel: false,
        hasTemplate: true,
        hasEsqlQuery: true,
      });

      await renderFlyoutContent();
      expect(screen.getByTestId('mockEditCustomContentFlyout')).toBeInTheDocument();
    });

    it('`onSave` updates state and closes the flyout', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      await act(async () => embeddable.api.onEdit());
      await renderFlyoutContent();

      await act(async () =>
        capturedFlyoutProps!.onSave('FROM metrics | LIMIT 10', '<div>new</div>')
      );

      const state = embeddable.api.serializeState();
      expect(readEsqlQuery(state)).toBe('FROM metrics | LIMIT 10');
      expect(state.template).toBe('<div>new</div>');
    });

    it('`onClose` closes the flyout', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      await act(async () => embeddable.api.onEdit());
      await renderFlyoutContent();

      await act(async () => capturedFlyoutProps!.onClose());
      await act(async () => mockFlyoutOnClose);
    });

    it('cancelling a new panel via the Cancel button removes it from the parent', async () => {
      const removePanel = jest.fn();
      mockApiIsPresentationContainer.mockReturnValue(true);
      const { embeddable } = await buildEmbeddable(baseState, { removePanel });
      await act(async () => render(<embeddable.Component />));

      await act(async () => embeddable.api.onEdit({ isNewPanel: true }));
      await renderFlyoutContent();

      await act(async () => capturedFlyoutProps!.onClose());
      await act(async () => mockFlyoutOnClose);
      expect(removePanel).toHaveBeenCalledWith('test-uuid');
      expect(mockTelemetry.trackEditCancelled).toHaveBeenCalledWith({
        isNewPanel: true,
        panelRemoved: true,
      });
    });

    it('dismissing a new panel via ESC/X removes it from the parent', async () => {
      const removePanel = jest.fn();
      mockApiIsPresentationContainer.mockReturnValue(true);
      const { embeddable } = await buildEmbeddable(baseState, { removePanel });
      await act(async () => render(<embeddable.Component />));

      await act(async () => embeddable.api.onEdit({ isNewPanel: true }));
      await renderFlyoutContent();

      await closeFlyout();
      expect(removePanel).toHaveBeenCalledWith('test-uuid');
    });

    it('cancelling an existing panel does not remove it', async () => {
      const removePanel = jest.fn();
      mockApiIsPresentationContainer.mockReturnValue(true);
      const { embeddable } = await buildEmbeddable(baseState, { removePanel });
      await act(async () => render(<embeddable.Component />));

      await act(async () => embeddable.api.onEdit());
      await renderFlyoutContent();

      await act(async () => capturedFlyoutProps!.onClose());
      await act(async () => mockFlyoutOnClose);
      expect(removePanel).not.toHaveBeenCalled();
      expect(mockTelemetry.trackEditCancelled).toHaveBeenCalledWith({
        isNewPanel: false,
        panelRemoved: false,
      });
    });

    it('saving a new panel does not remove it', async () => {
      const removePanel = jest.fn();
      mockApiIsPresentationContainer.mockReturnValue(true);
      const { embeddable } = await buildEmbeddable(baseState, { removePanel });
      await act(async () => render(<embeddable.Component />));

      await act(async () => embeddable.api.onEdit({ isNewPanel: true }));
      await renderFlyoutContent();

      await act(async () => capturedFlyoutProps!.onSave('FROM logs', '<div>saved</div>'));
      await act(async () => mockFlyoutOnClose);
      expect(removePanel).not.toHaveBeenCalled();
    });

    it('saving a new panel does not remove it on subsequent cancel', async () => {
      const removePanel = jest.fn();
      mockApiIsPresentationContainer.mockReturnValue(true);
      const { embeddable } = await buildEmbeddable(baseState, { removePanel });
      await act(async () => render(<embeddable.Component />));

      await act(async () => embeddable.api.onEdit({ isNewPanel: true }));
      await renderFlyoutContent();
      await act(async () => capturedFlyoutProps!.onSave('FROM logs', '<div>saved</div>'));
      await act(async () => mockFlyoutOnClose);

      capturedOpenLazyFlyoutArgs = undefined;
      await act(async () => embeddable.api.onEdit());
      await renderFlyoutContent();

      await act(async () => capturedFlyoutProps!.onClose());
      await act(async () => mockFlyoutOnClose);
      expect(removePanel).not.toHaveBeenCalled();
    });

    it('clicking "Generate with chat" from the flyout calls openChat and closes the flyout', async () => {
      const openChat = jest.fn();
      mockAgentBuilder = {
        openChat,
        events: {
          ui: { activeConversation$: new BehaviorSubject(null) },
          getChatEvents$: jest.fn(() => new Subject()),
        },
      };
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      await act(async () => embeddable.api.onEdit());
      await renderFlyoutContent();

      await act(async () => capturedFlyoutProps!.onGenerateWithChat?.('draft', undefined));

      expect(openChat).toHaveBeenCalledWith(expect.objectContaining({ newConversation: true }));
    });

    it('clicking "Generate with chat" from the flyout on a new panel does not remove it', async () => {
      const removePanel = jest.fn();
      const openChat = jest.fn();
      mockApiIsPresentationContainer.mockReturnValue(true);
      mockAgentBuilder = {
        openChat,
        events: {
          ui: { activeConversation$: new BehaviorSubject(null) },
          getChatEvents$: jest.fn(() => new Subject()),
        },
      };
      const { embeddable } = await buildEmbeddable(baseState, { removePanel });
      await act(async () => render(<embeddable.Component />));

      await act(async () => embeddable.api.onEdit({ isNewPanel: true }));
      await renderFlyoutContent();

      await act(async () => capturedFlyoutProps!.onGenerateWithChat?.('draft', undefined));
      await act(async () => mockFlyoutOnClose);

      expect(openChat).toHaveBeenCalled();
      expect(removePanel).not.toHaveBeenCalled();
    });
  });

  describe('agent event subscription', () => {
    const buildUpdateEvent = (
      embeddableId: string,
      panelTemplate: string,
      customEvent: string = CUSTOM_CONTENT_UPDATED_UI_EVENT
    ) => ({
      type: ChatEventType.toolUi,
      data: {
        tool_id: 'custom_content_update_panel',
        tool_call_id: 'tool-call-1',
        custom_event: customEvent,
        data: {
          attachmentId: 'att-1',
          data: { panel_template: panelTemplate, embeddable_id: embeddableId },
        },
      },
    });

    // `useBatchedPublishingSubjects` flushes on the next macrotask
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    const renderGeneratingPanel = async (isNewConversation = false) => {
      const chatEvents$ = new Subject<unknown>();
      const activeConversation$ = new BehaviorSubject<{ id?: string }>({
        id: isNewConversation ? undefined : 'conv-1',
      });
      const getChatEvents$ = jest.fn(() => chatEvents$);
      const openChat = jest.fn();
      mockAgentBuilder = { openChat, events: { ui: { activeConversation$ }, getChatEvents$ } };

      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));
      await act(async () => capturedComponentProps?.onGenerateWithChat?.());
      await act(async () => {
        openChat.mock.calls[0][0].onSubmit();
        await flush();
      });

      const emit = (...events: unknown[]) =>
        act(async () => {
          events.forEach((event) => chatEvents$.next(event));
          await flush();
        });
      return { embeddable, emit, activeConversation$, getChatEvents$ };
    };

    const expectGenerating = (isGenerating: boolean) =>
      expect(screen.getByTestId('mockCustomContentComponent')).toHaveAttribute(
        'data-is-generating',
        String(isGenerating)
      );

    it('applies only its own update and then clears the generating state', async () => {
      const { embeddable, emit } = await renderGeneratingPanel();

      await emit(
        buildUpdateEvent('other-uuid', '<p>not mine</p>'),
        buildUpdateEvent('test-uuid', '<p>other event</p>', 'workflow:yaml_changed')
      );
      expect(embeddable.api.serializeState().template).toBe('<div>static html</div>');
      expectGenerating(true);

      await emit(buildUpdateEvent('test-uuid', '<p>mine</p>'));
      expect(embeddable.api.serializeState().template).toBe('<p>mine</p>');
      expect(mockTelemetry.trackAgentUpdateApplied).toHaveBeenCalledTimes(1);
      expect(mockTelemetry.trackAgentUpdateApplied).toHaveBeenCalledWith({
        hasEsqlQuery: false,
        templateSizeBytes: '<p>mine</p>'.length,
      });
      expectGenerating(false);
    });

    it('applies the update from the first run of a new conversation', async () => {
      const { embeddable, emit, activeConversation$, getChatEvents$ } = await renderGeneratingPanel(
        true
      );
      expect(getChatEvents$).not.toHaveBeenCalled();

      // The chat creates the conversation before sending, so its id is published before the run streams
      await act(async () => activeConversation$.next({ id: 'new-conv' }));
      await emit(buildUpdateEvent('test-uuid', '<p>first run</p>'));

      expect(getChatEvents$).toHaveBeenCalledWith('new-conv');
      expect(embeddable.api.serializeState().template).toBe('<p>first run</p>');
      expectGenerating(false);
    });

    it.each([
      TimelineEventType.executionTerminated,
      TimelineEventType.executionFailed,
      TimelineEventType.executionAborted,
    ])('clears the generating state on %s', async (type) => {
      const { embeddable, emit } = await renderGeneratingPanel();

      await emit({ type, execution_id: 'exec-1', data: {} });

      expectGenerating(false);
      expect(embeddable.api.serializeState().template).toBe('<div>static html</div>');
    });
  });

  describe('handleGenerateWithChat', () => {
    it('shows a generating state while the panel chat round is running', async () => {
      const openChat = jest.fn();
      mockAgentBuilder = {
        openChat,
        events: {
          ui: { activeConversation$: new BehaviorSubject(null) },
          getChatEvents$: jest.fn(() => new Subject()),
        },
      };

      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));
      await act(async () => capturedComponentProps?.onGenerateWithChat?.());

      await act(async () => {
        openChat.mock.calls[0][0].onSubmit();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(screen.getByTestId('mockCustomContentComponent')).toHaveAttribute(
        'data-is-generating',
        'true'
      );

      await act(async () => {
        openChat.mock.calls[0][0].onClose();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(screen.getByTestId('mockCustomContentComponent')).toHaveAttribute(
        'data-is-generating',
        'false'
      );
    });

    it('clicking "Generate with chat" from the empty prompt on a new panel does not remove it', async () => {
      const removePanel = jest.fn();
      const openChat = jest.fn();
      mockApiIsPresentationContainer.mockReturnValue(true);
      mockAgentBuilder = {
        openChat,
        events: {
          ui: { activeConversation$: new BehaviorSubject(null) },
          getChatEvents$: jest.fn(() => new Subject()),
        },
      };
      // clearOverlays simulates overlay tracker closing the flyout
      const clearOverlays = jest.fn(() => mockFlyoutClose());
      const { embeddable } = await buildEmbeddable(baseState, {
        removePanel,
        clearOverlays,
        openOverlay: jest.fn(),
      });
      await act(async () => render(<embeddable.Component />));

      // Simulate new-panel flyout being open
      await act(async () => embeddable.api.onEdit({ isNewPanel: true }));
      await renderFlyoutContent();

      // User clicks "Generate with chat" from the panel's empty state (not the flyout).
      // handleGenerateWithChat sets isRetained=true then calls clearOverlays() which
      // closes the flyout, resolving flyoutRef.onClose.
      await act(async () => capturedComponentProps?.onGenerateWithChat?.());
      await act(async () => mockFlyoutOnClose);

      expect(openChat).toHaveBeenCalled();
      expect(removePanel).not.toHaveBeenCalled();
    });

    it('opens the agent builder with the correct attachment', async () => {
      const openChat = jest.fn();
      mockAgentBuilder = {
        openChat,
        events: {
          ui: { activeConversation$: new BehaviorSubject(null) },
          getChatEvents$: jest.fn(() => new Subject()),
        },
      };

      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      await act(async () => capturedComponentProps?.onGenerateWithChat?.());

      expect(openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({ embeddable_id: 'test-uuid' }),
            }),
          ]),
          // Which stored conversation gets restored depends on the entry point the user last used,
          // so refining always starts fresh; the attachments carry the state the agent needs.
          newConversation: true,
        })
      );
      expect(mockTelemetry.trackGenerateWithChatClicked).toHaveBeenCalledWith({
        triggerSource: 'empty_panel',
        hasExistingTemplate: false,
      });
    });

    it('clears overlays (closes edit flyout) before opening the agent builder', async () => {
      const openChat = jest.fn();
      const clearOverlays = jest.fn();
      mockAgentBuilder = {
        openChat,
        events: {
          ui: { activeConversation$: new BehaviorSubject(null) },
          getChatEvents$: jest.fn(() => new Subject()),
        },
      };

      const { embeddable } = await buildEmbeddable(baseState, {
        clearOverlays,
        openOverlay: jest.fn(),
      });
      await act(async () => render(<embeddable.Component />));

      await act(async () => capturedComponentProps?.onGenerateWithChat?.());

      expect(clearOverlays).toHaveBeenCalled();
      expect(openChat).toHaveBeenCalled();
    });

    it('does nothing when agentBuilder is unavailable (no throw)', async () => {
      mockAgentBuilder = undefined;
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      await expect(
        act(async () => capturedComponentProps?.onGenerateWithChat?.())
      ).resolves.not.toThrow();
    });
  });
});
