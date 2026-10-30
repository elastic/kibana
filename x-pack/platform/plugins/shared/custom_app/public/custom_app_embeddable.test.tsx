/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject, Subject } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import { openLazyFlyout } from '@kbn/presentation-util';
import { appDocumentSchema, isEmptyDocument, type AppDocument } from '@kbn/custom-app-common';
import type { CustomAppByValueState, CustomAppEmbeddableState } from '../server';
import { customAppEmbeddableFactory } from './custom_app_embeddable';

// Set by the tests that need chat; without it the panel behaves as when Agent Builder is absent.
let mockAgentBuilder: unknown;
let mockIsEditorEnabled = true;
jest.mock('./services', () => ({
  getServices: () => ({
    core: {
      http: {},
      application: { capabilities: {} },
      featureFlags: {
        getBooleanValue$: () => jest.requireActual('rxjs').of(mockIsEditorEnabled),
      },
      notifications: { toasts: {} },
      rendering: {},
    },
    search: jest.fn(),
    agentBuilder: mockAgentBuilder,
  }),
}));
jest.mock('./data/run_esql_query', () => ({
  createRunEsqlQuery: () => async () => ({ columns: [], rows: [] }),
}));
jest.mock('@kbn/presentation-util', () => ({ openLazyFlyout: jest.fn() }));

const documentWith = (heading: string): AppDocument =>
  appDocumentSchema.parse({
    root: {
      type: 'stack',
      id: 'root',
      children: [{ type: 'heading', id: 'title', text: heading }],
    },
  });

const SAVED = documentWith('Saved heading');

const build = async ({
  document = SAVED,
  viewMode,
}: { document?: AppDocument; viewMode?: 'view' | 'edit' } = {}) => {
  const initialState: CustomAppEmbeddableState = { version: 1, document };
  const { api, Component } = await customAppEmbeddableFactory.buildEmbeddable({
    initialState,
    finalizeApi: (registration: unknown) => registration,
    parentApi: viewMode ? { viewMode$: new BehaviorSubject(viewMode) } : {},
    uuid: 'panel-1',
  } as never);
  render(<Component />);
  return api as unknown as {
    onEdit: () => Promise<void>;
    isEditingEnabled: () => boolean;
    serializeState: () => CustomAppEmbeddableState;
    getDocument: () => AppDocument;
    anyStateChange$: { subscribe: (next: () => void) => { unsubscribe: () => void } };
  };
};

/** Opens the editor, and returns what it was given and the controls the test needs. */
const openEditor = async (api: Awaited<ReturnType<typeof build>>) => {
  let closeFlyoutRef: () => void = () => {};
  const closeFlyout = jest.fn();
  (openLazyFlyout as jest.Mock).mockReturnValue({
    onClose: new Promise<void>((resolve) => {
      closeFlyoutRef = resolve;
    }),
  });

  await api.onEdit();

  const { loadContent, flyoutProps } = (openLazyFlyout as jest.Mock).mock.calls[0][0];
  const element = await loadContent({ closeFlyout, ariaLabelledBy: 'title-id' });
  return {
    flyoutProps,
    editorProps: element.props,
    closeFlyout,
    /** The flyout going away, however it was closed. */
    flyoutClosed: () => act(async () => closeFlyoutRef()),
  };
};

const EMPTY: AppDocument = appDocumentSchema.parse({
  root: { type: 'stack', id: 'root', children: [] },
});

describe('the custom app panel', () => {
  beforeEach(() => (openLazyFlyout as jest.Mock).mockReset());

  describe('when there is nothing in it yet', () => {
    afterEach(() => {
      mockAgentBuilder = undefined;
    });

    it('offers no editor, but the assistant and the example, when the editor is turned off', async () => {
      mockIsEditorEnabled = false;
      mockAgentBuilder = {
        openChat: jest.fn(),
        events: { ui: { activeConversation$: new Subject() } },
      };
      try {
        const api = await build({ document: EMPTY, viewMode: 'edit' });

        expect(api.isEditingEnabled()).toBe(false);
        expect(screen.queryByTestId('customAppEmptyBuild')).not.toBeInTheDocument();
        expect(screen.getByTestId('customAppEmptyExample')).toBeInTheDocument();
        expect(screen.getByTestId('customAppEmptyDescribe')).toBeInTheDocument();
      } finally {
        mockIsEditorEnabled = true;
      }
    });

    it('invites whoever is laying out the dashboard to begin, not a blank panel', async () => {
      await build({ document: EMPTY, viewMode: 'edit' });

      expect(screen.getByText('Build your app')).toBeInTheDocument();
      expect(screen.getByTestId('customAppEmptyBuild')).toBeInTheDocument();
      expect(screen.getByTestId('customAppEmptyExample')).toBeInTheDocument();
    });

    it('only says it is empty to whoever is looking at the dashboard', async () => {
      await build({ document: EMPTY, viewMode: 'view' });

      expect(screen.getByText('This app is empty')).toBeInTheDocument();
      expect(screen.queryByTestId('customAppEmptyBuild')).not.toBeInTheDocument();
    });

    it('is not editable when its dashboard says nothing about a view mode', async () => {
      await build({ document: EMPTY });

      expect(screen.queryByTestId('customAppEmptyBuild')).not.toBeInTheDocument();
    });

    it('opens the editor when asked to build it', async () => {
      (openLazyFlyout as jest.Mock).mockReturnValue({ onClose: new Promise<void>(() => {}) });
      await build({ document: EMPTY, viewMode: 'edit' });

      await userEvent.click(screen.getByTestId('customAppEmptyBuild'));

      expect(openLazyFlyout).toHaveBeenCalledTimes(1);
    });

    it('becomes the example when asked to start from it, which can then be saved', async () => {
      const api = await build({ document: EMPTY, viewMode: 'edit' });

      await userEvent.click(screen.getByTestId('customAppEmptyExample'));

      expect(screen.queryByText('Build your app')).not.toBeInTheDocument();
      expect(screen.getByTestId('customAppFrame')).toBeInTheDocument();
      expect(api.getDocument().root).toMatchObject({ type: 'stack' });
      expect(isEmptyDocument(api.getDocument())).toBe(false);
    });

    it('does not offer to describe it when chat is not available', async () => {
      await build({ document: EMPTY, viewMode: 'edit' });
      expect(screen.queryByTestId('customAppEmptyDescribe')).not.toBeInTheDocument();
    });

    it('opens chat with the empty app attached when asked to describe it', async () => {
      const openChat = jest.fn();
      mockAgentBuilder = { openChat, events: { ui: { activeConversation$: new Subject() } } };
      await build({ document: EMPTY, viewMode: 'edit' });

      await userEvent.click(screen.getByTestId('customAppEmptyDescribe'));

      expect(openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          newConversation: true,
          attachments: [
            expect.objectContaining({
              data: expect.objectContaining({ embeddable_id: 'panel-1', document: EMPTY }),
            }),
          ],
        })
      );
    });
  });

  it('shows its saved document', async () => {
    await build();

    expect(screen.getByRole('heading', { name: 'Saved heading' })).toBeInTheDocument();
  });

  it('keeps the app inside a frame, so it has room around it in the panel', async () => {
    await build();

    expect(screen.getByTestId('customAppFrame')).toContainElement(
      screen.getByRole('heading', { name: 'Saved heading' })
    );
  });

  describe('offering its document to whatever wants to look at it', () => {
    it('gives the saved document', async () => {
      const api = await build();

      expect(api.getDocument()).toBe(SAVED);
    });

    it('gives the saved document, not the preview, while the editor is previewing', async () => {
      const api = await build();
      const { editorProps } = await openEditor(api);

      act(() => editorProps.onPreview(documentWith('Draft heading')));

      expect(api.getDocument()).toBe(SAVED);
    });

    it('gives the new document once an edit has been saved', async () => {
      const api = await build();
      const { editorProps } = await openEditor(api);
      const edited = documentWith('Edited heading');

      await act(async () => editorProps.onSave(edited));

      expect(api.getDocument()).toBe(edited);
    });
  });

  describe('editing', () => {
    it('opens the editor from the document it has, as a flyout beside the dashboard', async () => {
      const api = await build();

      const { flyoutProps, editorProps } = await openEditor(api);

      expect(editorProps.initialDocument).toBe(SAVED);
      expect(editorProps.ariaLabelledBy).toBe('title-id');
      // No explicit type: it is up to the dashboard, which makes it a push flyout by default.
      expect(flyoutProps.type).toBeUndefined();
      expect(flyoutProps.focusedPanelId).toBe('panel-1');
    });

    it('shows a preview of the draft on the panel itself, without changing what is saved', async () => {
      const api = await build();
      const { editorProps } = await openEditor(api);

      act(() => editorProps.onPreview(documentWith('Draft heading')));

      expect(await screen.findByRole('heading', { name: 'Draft heading' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Saved heading' })).not.toBeInTheDocument();
      expect((api.serializeState() as CustomAppByValueState).document).toBe(SAVED);
    });

    it('does not report a change to the panel while previewing', async () => {
      const api = await build();
      const changed = jest.fn();
      api.anyStateChange$.subscribe(changed);
      const { editorProps } = await openEditor(api);

      act(() => editorProps.onPreview(documentWith('Draft heading')));
      act(() => editorProps.onPreview(documentWith('Another draft')));

      expect(changed).not.toHaveBeenCalled();
    });

    it('follows each new preview', async () => {
      const api = await build();
      const { editorProps } = await openEditor(api);

      act(() => editorProps.onPreview(documentWith('First')));
      expect(await screen.findByRole('heading', { name: 'First' })).toBeInTheDocument();

      act(() => editorProps.onPreview(documentWith('Second')));
      expect(await screen.findByRole('heading', { name: 'Second' })).toBeInTheDocument();
    });

    it('goes back to the saved document when the editor closes, however it closes', async () => {
      const api = await build();
      const { editorProps, flyoutClosed } = await openEditor(api);
      act(() => editorProps.onPreview(documentWith('Draft heading')));
      expect(await screen.findByRole('heading', { name: 'Draft heading' })).toBeInTheDocument();

      await flyoutClosed();

      expect(await screen.findByRole('heading', { name: 'Saved heading' })).toBeInTheDocument();
      expect((api.serializeState() as CustomAppByValueState).document).toBe(SAVED);
    });

    it('saves the draft as the panel, and closes the editor', async () => {
      const api = await build();
      const { editorProps, closeFlyout, flyoutClosed } = await openEditor(api);
      const edited = documentWith('Edited heading');
      const changed = jest.fn();
      api.anyStateChange$.subscribe(changed);

      await act(async () => editorProps.onSave(edited));
      await flyoutClosed();

      expect(closeFlyout).toHaveBeenCalledTimes(1);
      expect((api.serializeState() as CustomAppByValueState).document).toBe(edited);
      expect(changed).toHaveBeenCalled();
      expect(await screen.findByRole('heading', { name: 'Edited heading' })).toBeInTheDocument();
    });

    it('closes the editor on cancel and leaves the panel as it was', async () => {
      const api = await build();
      const { editorProps, closeFlyout } = await openEditor(api);

      editorProps.onCancel();

      expect(closeFlyout).toHaveBeenCalledTimes(1);
      expect((api.serializeState() as CustomAppByValueState).document).toBe(SAVED);
    });

    it('keeps a value the author saved while previewing, since the preview is cleared after', async () => {
      const api = await build();
      const { editorProps, flyoutClosed } = await openEditor(api);
      const edited = documentWith('Edited heading');

      act(() => editorProps.onPreview(edited));
      await act(async () => editorProps.onSave(edited));
      await flyoutClosed();

      expect(await screen.findByRole('heading', { name: 'Edited heading' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Saved heading' })).not.toBeInTheDocument();
    });
  });

  describe('chat', () => {
    const fakeAgentBuilder = () => {
      const activeConversation$ = new BehaviorSubject<{ id: string } | undefined>(undefined);
      const chatEvents$ = new Subject<unknown>();
      return {
        openChat: jest.fn(),
        events: {
          ui: { activeConversation$ },
          getChatEvents$: jest.fn(() => chatEvents$),
        },
        activeConversation$,
        chatEvents$,
      };
    };

    const updatedEvent = (
      embeddableId: string,
      document: AppDocument,
      event = 'custom_app:updated'
    ) => ({
      type: ChatEventType.toolUi,
      data: {
        tool_id: 'custom_app_update_app',
        tool_call_id: 'call-1',
        custom_event: event,
        data: {
          attachmentId: 'att-1',
          data: { embeddable_id: embeddableId, document },
        },
      },
    });

    let agentBuilder: ReturnType<typeof fakeAgentBuilder>;

    beforeEach(() => {
      agentBuilder = fakeAgentBuilder();
      mockAgentBuilder = agentBuilder;
    });
    afterEach(() => {
      mockAgentBuilder = undefined;
    });

    describe('sending the app to chat', () => {
      it('is offered by the editor, and opens a new conversation with the app attached', async () => {
        const api = await build();
        const { editorProps, closeFlyout } = await openEditor(api);
        const draft = documentWith('Draft heading');

        editorProps.onGenerateWithChat(draft);

        expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
        expect(agentBuilder.openChat).toHaveBeenCalledWith({
          newConversation: true,
          attachments: [
            expect.objectContaining({
              type: 'platform.custom_app.app_context',
              data: expect.objectContaining({ embeddable_id: 'panel-1', document: draft }),
            }),
          ],
        });
        expect(closeFlyout).toHaveBeenCalledTimes(1);
      });

      it('sends the draft, not the saved app, so what the author was working on is what the agent starts from', async () => {
        const api = await build();
        const { editorProps } = await openEditor(api);

        editorProps.onGenerateWithChat(documentWith('Unsaved draft'));

        const [{ attachments }] = agentBuilder.openChat.mock.calls[0];
        expect(attachments[0].data.document).toEqual(documentWith('Unsaved draft'));
      });

      it('is not offered when Agent Builder is not available', async () => {
        mockAgentBuilder = undefined;
        const api = await build();

        const { editorProps } = await openEditor(api);

        expect(editorProps.onGenerateWithChat).toBeUndefined();
      });
    });

    describe('receiving the result', () => {
      const converse = async () => {
        const api = await build();
        agentBuilder.activeConversation$.next({ id: 'conversation-1' });
        return api;
      };

      it('listens only once there is a conversation, and to that one', async () => {
        await build();
        expect(agentBuilder.events.getChatEvents$).not.toHaveBeenCalled();

        await act(async () => agentBuilder.activeConversation$.next({ id: 'conversation-1' }));

        expect(agentBuilder.events.getChatEvents$).toHaveBeenCalledWith('conversation-1');
      });

      it('shows the app the agent made, on the panel, at once', async () => {
        const api = await converse();
        const made = documentWith('Made by the agent');

        await act(async () => agentBuilder.chatEvents$.next(updatedEvent('panel-1', made)));

        expect(
          await screen.findByRole('heading', { name: 'Made by the agent' })
        ).toBeInTheDocument();
        expect(api.getDocument()).toEqual(made);
      });

      it("makes it the panel's own state, so the dashboard has unsaved changes", async () => {
        const api = await converse();
        const changed = jest.fn();
        api.anyStateChange$.subscribe(changed);

        await act(async () =>
          agentBuilder.chatEvents$.next(updatedEvent('panel-1', documentWith('Made by the agent')))
        );

        expect(changed).toHaveBeenCalled();
        expect((api.serializeState() as CustomAppByValueState).document).toEqual(
          documentWith('Made by the agent')
        );
      });

      it('ignores an answer about another panel', async () => {
        const api = await converse();

        await act(async () =>
          agentBuilder.chatEvents$.next(updatedEvent('panel-2', documentWith('For someone else')))
        );

        expect(api.getDocument()).toBe(SAVED);
        expect(screen.getByRole('heading', { name: 'Saved heading' })).toBeInTheDocument();
      });

      it('ignores events that are not about a custom app', async () => {
        const api = await converse();

        await act(async () => {
          agentBuilder.chatEvents$.next(
            updatedEvent('panel-1', documentWith('Not this'), 'custom_content:updated')
          );
          agentBuilder.chatEvents$.next({ type: 'something-else' });
        });

        expect(api.getDocument()).toBe(SAVED);
      });

      it('ignores an app that is not valid, rather than break the panel', async () => {
        const api = await converse();
        const broken = { root: { type: 'carousel', id: 'x' } } as unknown as AppDocument;

        await act(async () => agentBuilder.chatEvents$.next(updatedEvent('panel-1', broken)));

        expect(api.getDocument()).toBe(SAVED);
        expect(screen.getByRole('heading', { name: 'Saved heading' })).toBeInTheDocument();
      });

      it('follows each answer in turn, as the agent refines the app', async () => {
        await converse();

        await act(async () =>
          agentBuilder.chatEvents$.next(updatedEvent('panel-1', documentWith('First')))
        );
        expect(await screen.findByRole('heading', { name: 'First' })).toBeInTheDocument();

        await act(async () =>
          agentBuilder.chatEvents$.next(updatedEvent('panel-1', documentWith('Second')))
        );
        expect(await screen.findByRole('heading', { name: 'Second' })).toBeInTheDocument();
      });

      it('moves to the next conversation when the user starts another', async () => {
        await converse();
        const second = new Subject<unknown>();
        agentBuilder.events.getChatEvents$.mockReturnValueOnce(second);

        await act(async () => agentBuilder.activeConversation$.next({ id: 'conversation-2' }));
        await act(async () =>
          second.next(updatedEvent('panel-1', documentWith('From the second')))
        );

        expect(await screen.findByRole('heading', { name: 'From the second' })).toBeInTheDocument();
      });

      it('does not listen at all without Agent Builder, and does not mind', async () => {
        mockAgentBuilder = undefined;

        await expect(build()).resolves.toBeDefined();
        expect(agentBuilder.events.getChatEvents$).not.toHaveBeenCalled();
      });
    });
  });
});
