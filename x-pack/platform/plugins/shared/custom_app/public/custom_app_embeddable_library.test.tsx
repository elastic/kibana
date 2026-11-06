/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import { openLazyFlyout } from '@kbn/presentation-util';
import { appDocumentSchema, type AppDocument } from '@kbn/custom-app-common';
import type { CustomAppByReferenceState, CustomAppByValueState } from '../server';
import { customAppEmbeddableFactory } from './custom_app_embeddable';

const mockSavedApps = {
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
};
const mockToasts = { addDanger: jest.fn() };
let mockAgentBuilder: unknown;

jest.mock('./application/saved_apps_client', () => ({
  createSavedAppsClient: () => mockSavedApps,
}));
jest.mock('./services', () => ({
  getServices: () => ({
    core: {
      http: {},
      application: { capabilities: {} },
      featureFlags: {
        getBooleanValue$: () => jest.requireActual('rxjs').of(true),
      },
      notifications: { toasts: mockToasts },
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

const LIBRARY_DOCUMENT = documentWith('Library heading');
const OWN_DOCUMENT = documentWith('Own heading');

const libraryItem = (overrides = {}) => ({
  id: 'lib-1',
  title: 'Library app',
  description: 'About it',
  version: 1,
  document: LIBRARY_DOCUMENT,
  ...overrides,
});

interface Api {
  serializeState: () => CustomAppByValueState | CustomAppByReferenceState;
  getDocument: () => AppDocument;
  onEdit: () => Promise<void>;
  anyStateChange$: { subscribe: (next: () => void) => { unsubscribe: () => void } };
  defaultTitle$: BehaviorSubject<string | undefined>;
  defaultDescription$: BehaviorSubject<string | undefined>;
  getLibraryId: () => string | undefined;
  canLinkToLibrary: () => Promise<boolean>;
  canUnlinkFromLibrary: () => Promise<boolean>;
  saveToLibrary: (title: string) => Promise<string>;
  hasLibraryItemWithTitle: (title: string) => Promise<boolean>;
  getSerializedStateByValue: () => CustomAppByValueState;
  getSerializedStateByReference: (id: string) => CustomAppByReferenceState;
}

const build = async (initialState: object) => {
  const { api, Component } = await customAppEmbeddableFactory.buildEmbeddable({
    initialState,
    finalizeApi: (registration: unknown) => registration,
    parentApi: {},
    uuid: 'panel-1',
  } as never);
  render(<Component />);
  return api as unknown as Api;
};

const buildLinked = () => build({ ref_id: 'lib-1', title: 'Panel title' });
const buildOwn = () => build({ version: 1, document: OWN_DOCUMENT });

/** Opens the editor of a panel, and gives what it was given. */
const openEditor = async (api: Api) => {
  const closeFlyout = jest.fn();
  (openLazyFlyout as jest.Mock).mockReturnValue({ onClose: new Promise<void>(() => {}) });
  await api.onEdit();
  const { loadContent } = (openLazyFlyout as jest.Mock).mock.calls[0][0];
  const element = await loadContent({ closeFlyout, ariaLabelledBy: 'title-id' });
  return { editorProps: element.props, closeFlyout };
};

describe('the custom app panel and the library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSavedApps.get.mockResolvedValue(libraryItem());
    mockAgentBuilder = undefined;
  });

  describe('a panel that links to an app of the library', () => {
    it('shows the app it links to', async () => {
      await buildLinked();

      expect(await screen.findByRole('heading', { name: 'Library heading' })).toBeInTheDocument();
      expect(mockSavedApps.get).toHaveBeenCalledWith('lib-1');
    });

    it('is called what the library item is, until it is given a title of its own', async () => {
      const api = await buildLinked();

      expect(api.defaultTitle$.getValue()).toBe('Library app');
      expect(api.defaultDescription$.getValue()).toBe('About it');
    });

    it('is saved on the dashboard as the link and its own titles, and not as a copy of the app', async () => {
      const api = await buildLinked();

      const state = api.serializeState();

      expect(state).toMatchObject({ ref_id: 'lib-1', title: 'Panel title' });
      expect(state).not.toHaveProperty('document');
      expect(state).not.toHaveProperty('version');
    });

    it('says which app it links to, which is how a menu item can open it', async () => {
      const api = await buildLinked();

      expect(api.getLibraryId()).toBe('lib-1');
    });

    it('tells the editor that the app is shared, so that the author knows what applying does', async () => {
      const api = await buildLinked();

      const { editorProps } = await openEditor(api);

      expect(editorProps.isShared).toBe(true);
    });

    it('can be unlinked and not linked again', async () => {
      const api = await buildLinked();

      expect(await api.canUnlinkFromLibrary()).toBe(true);
      expect(await api.canLinkToLibrary()).toBe(false);
    });

    it('becomes an app of its own, a copy of what it showed, when it is unlinked', async () => {
      const api = await buildLinked();

      const state = api.getSerializedStateByValue();

      expect(state).toMatchObject({ version: 1, document: LIBRARY_DOCUMENT });
      expect(state).not.toHaveProperty('ref_id');
    });

    it('does not make the dashboard unsaved when the app it links to changes', async () => {
      const api = await buildLinked();
      const changed = jest.fn();
      api.anyStateChange$.subscribe(changed);
      mockSavedApps.update.mockResolvedValue({});
      const { editorProps } = await openEditor(api);

      await act(async () => editorProps.onSave(documentWith('Edited heading')));

      expect(changed).not.toHaveBeenCalled();
    });

    describe('editing', () => {
      it('saves the change to the app in the library, under its own title, and shows it', async () => {
        const api = await buildLinked();
        mockSavedApps.update.mockResolvedValue({});
        const { editorProps, closeFlyout } = await openEditor(api);
        const edited = documentWith('Edited heading');

        await act(async () => editorProps.onSave(edited));

        expect(mockSavedApps.update).toHaveBeenCalledWith('lib-1', {
          title: 'Library app',
          description: 'About it',
          document: edited,
        });
        expect(closeFlyout).toHaveBeenCalled();
        expect(await screen.findByRole('heading', { name: 'Edited heading' })).toBeInTheDocument();
      });

      it('says why, keeps the editor open and leaves the panel as it was, when it cannot be saved', async () => {
        const api = await buildLinked();
        mockSavedApps.update.mockRejectedValue({ body: { message: 'Not allowed' } });
        const { editorProps, closeFlyout } = await openEditor(api);

        await act(async () => editorProps.onSave(documentWith('Edited heading')));

        expect(mockToasts.addDanger).toHaveBeenCalledWith(
          expect.objectContaining({ text: 'Not allowed' })
        );
        expect(closeFlyout).not.toHaveBeenCalled();
        expect(api.getDocument()).toEqual(LIBRARY_DOCUMENT);
      });
    });

    describe('when the app cannot be loaded', () => {
      it('does not build a panel, and says what went wrong, when the library does not answer', async () => {
        mockSavedApps.get.mockRejectedValue(new Error('Not found'));

        await expect(buildLinked()).rejects.toThrow('Not found');
      });

      it('does not build a panel, and says what is wrong, when the app in the library is not valid', async () => {
        mockSavedApps.get.mockResolvedValue(
          libraryItem({ document: { state: {}, root: { type: 'carousel', id: 'x' } } })
        );

        await expect(buildLinked()).rejects.toThrow(/Library app.*cannot be shown/);
      });
    });

    describe('when the agent changes the app', () => {
      const fakeAgentBuilder = () => {
        const activeConversation$ = new BehaviorSubject<{ id: string } | undefined>(undefined);
        const chatEvents$ = new Subject<unknown>();
        return {
          openChat: jest.fn(),
          events: { ui: { activeConversation$ }, getChatEvents$: jest.fn(() => chatEvents$) },
          activeConversation$,
          chatEvents$,
        };
      };
      const updated = (document: AppDocument) => ({
        type: ChatEventType.toolUi,
        data: {
          tool_id: 'custom_app_update_app',
          tool_call_id: 'call-1',
          custom_event: 'custom_app:updated',
          data: { attachmentId: 'att-1', data: { embeddable_id: 'panel-1', document } },
        },
      });

      it('saves it to the library, where the app lives, and shows it', async () => {
        const agent = fakeAgentBuilder();
        mockAgentBuilder = agent;
        mockSavedApps.update.mockResolvedValue({});
        await buildLinked();
        agent.activeConversation$.next({ id: 'conversation-1' });
        const made = documentWith('Made by the agent');

        await act(async () => agent.chatEvents$.next(updated(made)));

        expect(mockSavedApps.update).toHaveBeenCalledWith(
          'lib-1',
          expect.objectContaining({ document: made })
        );
        expect(
          await screen.findByRole('heading', { name: 'Made by the agent' })
        ).toBeInTheDocument();
      });
    });
  });

  describe('a panel with an app of its own', () => {
    it('does not load anything from the library', async () => {
      await buildOwn();

      expect(mockSavedApps.get).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'Own heading' })).toBeInTheDocument();
    });

    it('is saved on the dashboard with its document, as before', async () => {
      const api = await buildOwn();

      expect(api.serializeState()).toMatchObject({ version: 1, document: OWN_DOCUMENT });
      expect(api.serializeState()).not.toHaveProperty('ref_id');
    });

    it('links to nothing, and does not tell the editor that the app is shared', async () => {
      const api = await buildOwn();
      const { editorProps } = await openEditor(api);

      expect(api.getLibraryId()).toBeUndefined();
      expect(editorProps.isShared).toBe(false);
    });

    it('can be linked and not unlinked', async () => {
      const api = await buildOwn();

      expect(await api.canLinkToLibrary()).toBe(true);
      expect(await api.canUnlinkFromLibrary()).toBe(false);
    });

    it('is saved to the library as the app it is, under the title chosen, and gives the id', async () => {
      const api = await build({ version: 1, document: OWN_DOCUMENT, description: 'Panel notes' });
      mockSavedApps.create.mockResolvedValue({ id: 'new-lib' });

      const id = await api.saveToLibrary('My app');

      expect(id).toBe('new-lib');
      expect(mockSavedApps.create).toHaveBeenCalledWith({
        title: 'My app',
        description: 'Panel notes',
        document: OWN_DOCUMENT,
      });
    });

    it('becomes a link to the app that was made of it', async () => {
      const api = await buildOwn();

      expect(api.getSerializedStateByReference('new-lib')).toMatchObject({ ref_id: 'new-lib' });
      expect(api.getSerializedStateByReference('new-lib')).not.toHaveProperty('document');
    });

    it('applies the editor to the panel, saving nothing to the library', async () => {
      const api = await buildOwn();
      const changed = jest.fn();
      api.anyStateChange$.subscribe(changed);
      const { editorProps } = await openEditor(api);

      await act(async () => editorProps.onSave(documentWith('Edited heading')));

      expect(mockSavedApps.update).not.toHaveBeenCalled();
      expect(changed).toHaveBeenCalled();
    });

    describe('checking whether the library has an app with a title', () => {
      it('says yes for the same title, whatever the case', async () => {
        const api = await buildOwn();
        mockSavedApps.find.mockResolvedValue({
          apps: [{ id: '1', title: 'Service Explorer' }],
          total: 1,
          page: 1,
          perPage: 100,
        });

        expect(await api.hasLibraryItemWithTitle('service explorer')).toBe(true);
      });

      it('says no for a title that only starts the same way, which is a different app', async () => {
        const api = await buildOwn();
        mockSavedApps.find.mockResolvedValue({
          apps: [{ id: '1', title: 'Service explorer 2' }],
          total: 1,
          page: 1,
          perPage: 100,
        });

        expect(await api.hasLibraryItemWithTitle('Service explorer')).toBe(false);
      });
    });
  });
});
