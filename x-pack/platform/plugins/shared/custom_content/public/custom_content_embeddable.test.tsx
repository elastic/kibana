/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { render, screen, act } from '@testing-library/react';
import { ChatEventType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { customContentEmbeddableFactory } from './custom_content_embeddable';
import type { CustomContentApi } from './custom_content_embeddable';
import type { CustomContentEmbeddableState } from '../server';
import { CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE } from '../common/panel_context_attachment';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';

jest.mock('@kbn/presentation-publishing', () => {
  const actual = jest.requireActual('@kbn/presentation-publishing');
  return { ...actual, apiIsPresentationContainer: jest.fn(() => false) };
});

const mockApiIsPresentationContainer = apiIsPresentationContainer as jest.MockedFunction<
  typeof apiIsPresentationContainer
>;

let capturedComponentProps: { onGenerateWithChat?: () => void } | undefined;

jest.mock('./components/custom_content_component', () => ({
  CustomContentComponent: (props: {
    esqlQuery: string | undefined;
    savedTemplate: string | undefined;
    generationVersion: number;
    onGenerateWithChat?: () => void;
  }) => {
    capturedComponentProps = props;
    return (
      <div
        data-test-subj="mockCustomContentComponent"
        data-esql-query={props.esqlQuery ?? ''}
        data-saved-template={props.savedTemplate ?? ''}
        data-generation-version={props.generationVersion}
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
  EditCustomContentFlyout: (props: any) => {
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
  openLazyFlyout: (args: any) => {
    capturedOpenLazyFlyoutArgs = args;
    let resolve: () => void;
    mockFlyoutOnClose = new Promise<void>((r) => {
      resolve = r;
    });
    mockFlyoutClose = () => resolve();
    return { onClose: mockFlyoutOnClose, close: mockFlyoutClose };
  },
  tracksOverlays: (api: any) =>
    !!api && typeof api.clearOverlays === 'function' && typeof api.openOverlay === 'function',
}));

let mockAgentBuilder: unknown;

jest.mock('./services', () => ({
  getServices: () => ({ agentBuilder: mockAgentBuilder, core: { http: {} }, search: jest.fn() }),
}));

const baseState: CustomContentEmbeddableState = {
  prompt: 'Show KPI cards',
  esqlQuery: 'FROM logs | STATS count = COUNT(*)',
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
    it('round-trips prompt and template from initial state', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      expect(embeddable.api.serializeState()).toEqual(baseState);
    });

    it('reflects updates applied via applySerializedState', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const nextState: CustomContentEmbeddableState = {
        prompt: 'Show a status board',
        template: '<div>new</div>',
      };

      act(() => {
        embeddable.api.applySerializedState(nextState);
      });

      expect(embeddable.api.serializeState()).toEqual(nextState);
    });

    it('serializes template as undefined when not provided', async () => {
      const { embeddable } = await buildEmbeddable({ prompt: 'Test', template: undefined });
      expect(embeddable.api.serializeState().template).toBeUndefined();
    });

    it('reflects esqlQuery update applied via applySerializedState', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      act(() => {
        embeddable.api.applySerializedState({
          ...baseState,
          esqlQuery: 'FROM metrics | STATS avg = AVG(value)',
        });
      });
      expect(embeddable.api.serializeState().esqlQuery).toBe(
        'FROM metrics | STATS avg = AVG(value)'
      );
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
          esqlQuery: 'FROM metrics | LIMIT 10',
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
      expect(el).toHaveAttribute('data-esql-query', baseState.esqlQuery);
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
      expect(state.esqlQuery).toBe('FROM metrics | LIMIT 10');
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

      expect(openChat).toHaveBeenCalled();
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
    it('applies template update from RoundCompleteEvent attachment', async () => {
      const chatEvents$ = new Subject<any>();
      const activeConversation$ = new BehaviorSubject<{ id: string } | null>({ id: 'conv-1' });

      mockAgentBuilder = {
        events: {
          ui: { activeConversation$ },
          getChatEvents$: jest.fn(() => chatEvents$),
        },
      };

      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      const roundCompleteEvent = {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            input: {
              attachment_refs: [
                {
                  attachment_id: 'att-1',
                  version: 2,
                  operation: 'updated',
                  actor: ATTACHMENT_REF_ACTOR.agent,
                },
              ],
            },
          },
          attachments: [
            {
              id: 'att-1',
              type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
              current_version: 2,
              versions: [
                {
                  version: 2,
                  data: {
                    panel_template: '<p>agent result</p>',
                    embeddable_id: 'test-uuid',
                  },
                },
              ],
            },
          ],
        },
      };

      await act(async () => chatEvents$.next(roundCompleteEvent));

      expect(embeddable.api.serializeState().template).toBe('<p>agent result</p>');
    });

    it('ignores events for a different embeddable_id', async () => {
      const chatEvents$ = new Subject<any>();
      const activeConversation$ = new BehaviorSubject<{ id: string } | null>({ id: 'conv-1' });

      mockAgentBuilder = {
        events: {
          ui: { activeConversation$ },
          getChatEvents$: jest.fn(() => chatEvents$),
        },
      };

      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      const roundCompleteEvent = {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            input: {
              attachment_refs: [
                {
                  attachment_id: 'att-1',
                  version: 2,
                  operation: 'updated',
                  actor: ATTACHMENT_REF_ACTOR.agent,
                },
              ],
            },
          },
          attachments: [
            {
              id: 'att-1',
              type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
              current_version: 2,
              versions: [
                {
                  version: 2,
                  data: {
                    panel_template: '<p>other panel</p>',
                    embeddable_id: 'different-uuid',
                  },
                },
              ],
            },
          ],
        },
      };

      await act(async () => chatEvents$.next(roundCompleteEvent));

      expect(embeddable.api.serializeState().template).toBe('<div>static html</div>');
    });
  });

  describe('handleGenerateWithChat', () => {
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
          sessionTag: expect.stringContaining('test-uuid'),
        })
      );
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
