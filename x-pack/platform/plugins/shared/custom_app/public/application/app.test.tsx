/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { BehaviorSubject, Subject } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { ScopedHistory } from '@kbn/core/public';
import { App } from './app';
import type { SavedApp, SavedAppsClient } from './saved_apps_client';

jest.mock('@kbn/presentation-util-plugin/public', () => ({
  SavedObjectSaveModalDashboard: ({
    onSave,
  }: {
    onSave: (props: {
      dashboardId: string | null;
      newTitle: string;
      newDescription: string;
      addToLibrary: boolean;
    }) => void;
  }) => (
    <div data-test-subj="dashboardModal">
      <button
        type="button"
        onClick={() =>
          onSave({
            dashboardId: 'dash-1',
            newTitle: 'Service explorer',
            newDescription: 'Filters and a table',
            addToLibrary: false,
          })
        }
      >
        {'confirm unchanged'}
      </button>
      <button
        type="button"
        onClick={() =>
          onSave({
            dashboardId: 'dash-1',
            newTitle: 'Renamed here',
            newDescription: 'Filters and a table',
            addToLibrary: false,
          })
        }
      >
        {'confirm renamed'}
      </button>
      <button
        type="button"
        onClick={() =>
          onSave({
            dashboardId: null,
            newTitle: 'Service explorer',
            newDescription: 'Filters and a table',
            addToLibrary: false,
          })
        }
      >
        {'confirm new dashboard'}
      </button>
    </div>
  ),
}));
jest.mock('../components/live_app', () => ({
  LiveApp: ({ document, appId }: { document: { root: { id: string } }; appId?: string }) => (
    <div data-test-subj="liveApp" data-app-id={appId}>
      {document.root.id}
    </div>
  ),
}));
const savedApp = (overrides: Partial<SavedApp> = {}): SavedApp => ({
  id: 'app-1',
  title: 'Service explorer',
  description: 'Filters and a table',
  version: 1,
  document: { state: {}, root: { type: 'heading', id: 'title', text: 'Hi' } },
  updatedAt: '2026-10-16T10:00:00.000Z',
  ...overrides,
});

/** An assistant that can be asked to open, and can be made to answer. */
const makeAgentBuilder = () => {
  const activeConversation$ = new BehaviorSubject<{ id: string } | undefined>(undefined);
  const chatEvents$ = new Subject<unknown>();
  return {
    openChat: jest.fn(),
    events: {
      ui: { activeConversation$ },
      getChatEvents$: jest.fn(() => chatEvents$),
    },
    /** The agent has made an app, in the conversation that is open. */
    made: (attachmentId: string, document: unknown, title?: string) => {
      activeConversation$.next({ id: 'conversation-1' });
      chatEvents$.next({
        type: ChatEventType.toolUi,
        data: {
          tool_id: 'custom_app_create_app',
          tool_call_id: 'call-0',
          custom_event: 'custom_app:created',
          data: { attachmentId, data: { document, ...(title ? { panel_title: title } : {}) } },
        },
      });
    },
    /** The agent has changed the app of the attachment with this id. */
    answer: (attachmentId: string, document: unknown) => {
      activeConversation$.next({ id: 'conversation-1' });
      chatEvents$.next({
        type: ChatEventType.toolUi,
        data: {
          tool_id: 'custom_app_update_app',
          tool_call_id: 'call-1',
          custom_event: 'custom_app:updated',
          data: { attachmentId, data: { document } },
        },
      });
    },
  };
};

const madeByTheAgent = {
  state: {},
  root: { type: 'text', id: 'agent-made', text: 'From the agent' },
};

const makeClient = () =>
  ({
    find: jest.fn().mockResolvedValue({
      apps: [{ id: 'app-1', title: 'Service explorer', description: 'Filters and a table' }],
      total: 1,
      page: 1,
      perPage: 20,
    }),
    get: jest.fn().mockResolvedValue(savedApp()),
    create: jest.fn().mockResolvedValue(savedApp({ id: 'new-1', title: 'Fresh' })),
    update: jest.fn().mockImplementation(async (_id, input) => savedApp({ ...input })),
    remove: jest.fn().mockResolvedValue({ id: 'app-1' }),
  } as jest.Mocked<SavedAppsClient>);

/** The menu of the header keeps what does not fit in a popover, as it does here: open it for an item. */
const findMenuItem = async (testId: string) => {
  if (!screen.queryByTestId(testId)) await openAppMenuOverflow();
  return screen.findByTestId(testId);
};

const queryMenuItem = async (testId: string) => {
  if (!screen.queryByTestId(testId)) await openAppMenuOverflow();
  return screen.queryByTestId(testId);
};

let lastAgent: ReturnType<typeof makeAgentBuilder> | undefined;

/** The agent makes a change to the app that is on the page, which becomes a draft that is not saved. */
const applyAgentDraft = async () => {
  const describeButton = screen.queryByTestId('customAppEmptyDescribe');
  await userEvent.click(describeButton ?? (await findMenuItem('customAppRefineWithAi')));
  const { attachments } = lastAgent!.openChat.mock.calls.at(-1)![0];
  await act(async () =>
    lastAgent!.answer(attachments[0].id, {
      state: {},
      root: { type: 'text', id: 'edited', text: 'x' },
    })
  );
  // What was pressed to ask may have left the menu open.
  await userEvent.keyboard('{Escape}');
};

const setup = ({
  canSave = true,
  canWriteDashboards = true,
  path = '/',
  prepare,
  agentBuilder,
  confirmLeave = true,
}: {
  /** What the person answers when asked whether to leave with unsaved changes. */
  confirmLeave?: boolean;
  /** An assistant that can be made to answer. Null for a page where chat is not available. */
  agentBuilder?: ReturnType<typeof makeAgentBuilder> | null;
  canWriteDashboards?: boolean;
  canSave?: boolean;
  path?: string;
  /** Sets up what the client answers, before the page asks. */
  prepare?: (client: jest.Mocked<SavedAppsClient>) => void;
} = {}) => {
  const client = makeClient();
  const agent = agentBuilder === null ? undefined : agentBuilder ?? makeAgentBuilder();
  lastAgent = agent;
  const onAppLeave = jest.fn();
  const navigateToWithEmbeddablePackages = jest.fn().mockResolvedValue(undefined);
  prepare?.(client);
  const history = createMemoryHistory({
    initialEntries: [path],
    getUserConfirmation: (_message, callback) => callback(confirmLeave),
  });
  const notifications = { toasts: { addDanger: jest.fn(), addSuccess: jest.fn() } };
  const chrome = { setBreadcrumbs: jest.fn() };
  render(
    <MockAppHeaderProvider>
      <App
        history={history as unknown as ScopedHistory}
        client={client}
        chrome={chrome as never}
        notifications={notifications as never}
        canSave={canSave}
        agentBuilder={agent as never}
        onAppLeave={onAppLeave}
        stateTransfer={{ navigateToWithEmbeddablePackages } as never}
        canWriteDashboards={canWriteDashboards}
      />
    </MockAppHeaderProvider>
  );
  return { client, history, notifications, chrome, onAppLeave, navigateToWithEmbeddablePackages };
};

describe('the custom apps page', () => {
  describe('the list', () => {
    it('lists the apps, each a link to its own page', async () => {
      const { history } = setup();

      await userEvent.click(await screen.findByRole('link', { name: 'Service explorer' }));

      expect(history.location.pathname).toBe('/view/app-1');
    });

    it('asks for the apps that match what is typed, after a short wait', async () => {
      const { client } = setup();
      await screen.findByText('Service explorer');

      await userEvent.type(screen.getByRole('searchbox', { name: 'Search apps' }), 'serv');

      await waitFor(() =>
        expect(client.find).toHaveBeenLastCalledWith({ search: 'serv', page: 1, perPage: 20 })
      );
    });

    it('goes to a new, unsaved app when asked to create one, and saves nothing yet', async () => {
      const { client, history } = setup();
      await screen.findByText('Service explorer');

      await userEvent.click(screen.getByTestId('customAppCreate'));

      expect(history.location.pathname).toBe('/create');
      expect(client.create).not.toHaveBeenCalled();
    });

    it('asks before it deletes, then lists again', async () => {
      const { client } = setup();
      await screen.findByText('Service explorer');

      await userEvent.click(screen.getByTestId('customAppDelete'));
      expect(client.remove).not.toHaveBeenCalled();
      await userEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' })
      );

      await waitFor(() => expect(client.remove).toHaveBeenCalledWith('app-1'));
      await waitFor(() => expect(client.find.mock.calls.length).toBeGreaterThan(1));
    });

    it('offers nothing that changes an app to someone who may only read', async () => {
      setup({ canSave: false });
      await screen.findByText('Service explorer');

      expect(screen.queryByTestId('customAppCreate')).not.toBeInTheDocument();
      expect(screen.queryByTestId('customAppDelete')).not.toBeInTheDocument();
    });

    it('invites the first app when there are none, to those who can create one', async () => {
      setup({
        prepare: (client) =>
          client.find.mockResolvedValue({ apps: [], total: 0, page: 1, perPage: 20 }),
      });

      expect(await screen.findByText('No apps yet')).toBeInTheDocument();
      expect(screen.getAllByTestId('customAppCreate').length).toBeGreaterThan(0);
    });

    it('says why the list could not be loaded', async () => {
      setup({
        prepare: (client) => client.find.mockRejectedValue({ body: { message: 'Index closed' } }),
      });

      expect(await screen.findByText('The apps could not be loaded')).toBeInTheDocument();
      expect(screen.getByText('Index closed')).toBeInTheDocument();
    });
  });

  describe('a new app', () => {
    const openEditor = async () => {};
    const apply = applyAgentDraft;

    it('opens on an empty state and not on an example, with nothing saved', async () => {
      const { client } = setup({ path: '/create' });

      expect(await screen.findByText('Build your app')).toBeInTheDocument();
      expect(screen.queryByTestId('liveApp')).not.toBeInTheDocument();
      expect(client.create).not.toHaveBeenCalled();
    });

    it('has nothing to save, or to warn about, until something is in it', async () => {
      const { onAppLeave } = setup({ path: '/create' });
      await screen.findByText('Build your app');

      expect(screen.getByTestId('customAppSave')).toBeDisabled();
      const handler = onAppLeave.mock.calls.at(-1)?.[0];
      expect(handler({ confirm: () => 'confirm', default: () => 'default' })).toBe('default');
    });

    describe('with the assistant', () => {
      const attachedTo = (agent: ReturnType<typeof makeAgentBuilder>) =>
        agent.openChat.mock.calls[0][0].attachments[0];

      it('opens a conversation with the start of a request, and the app as it is, attached', async () => {
        const agent = makeAgentBuilder();
        setup({ path: '/create', agentBuilder: agent });

        await userEvent.click(await screen.findByTestId('customAppEmptyDescribe'));

        expect(agent.openChat).toHaveBeenCalledWith(
          expect.objectContaining({
            newConversation: true,
            initialMessage: 'Create a custom app that ',
          })
        );
        const attachment = attachedTo(agent);
        expect(attachment.type).toBe('platform.custom_app.app_context');
        expect(attachment.data).toMatchObject({
          document: { root: { type: 'stack', children: [] } },
        });
        // A page has no panel: it is told apart by the id of its attachment.
        expect(attachment.data).not.toHaveProperty('embeddable_id');
        expect(attachment.id).toMatch(/^platform\.custom_app\.app_context-page-/);
      });

      it('shows what the agent makes on the page, as a draft that is not saved', async () => {
        const agent = makeAgentBuilder();
        const { client } = setup({ path: '/create', agentBuilder: agent });
        await userEvent.click(await screen.findByTestId('customAppEmptyDescribe'));

        await act(async () => agent.answer(attachedTo(agent).id, madeByTheAgent));

        expect(await screen.findByTestId('liveApp')).toHaveTextContent('agent-made');
        expect(screen.queryByTestId('customAppEmpty')).not.toBeInTheDocument();
        expect(screen.getByText('Unsaved')).toBeInTheDocument();
        expect(screen.getByTestId('customAppSave')).toBeEnabled();
        expect(client.create).not.toHaveBeenCalled();
      });

      it('can then be saved with a name, as anything put together on the page', async () => {
        const agent = makeAgentBuilder();
        const { client, history } = setup({ path: '/create', agentBuilder: agent });
        client.create.mockResolvedValue(savedApp({ id: 'new-1', title: 'Fresh' }));
        await userEvent.click(await screen.findByTestId('customAppEmptyDescribe'));
        await act(async () => agent.answer(attachedTo(agent).id, madeByTheAgent));

        await userEvent.click(await screen.findByTestId('customAppSave'));
        await userEvent.type(screen.getByTestId('customAppDetailsTitle'), 'Fresh');
        await userEvent.click(screen.getByTestId('customAppDetailsConfirm'));

        await waitFor(() => expect(history.location.pathname).toBe('/view/new-1'));
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            document: expect.objectContaining({
              root: expect.objectContaining({ id: 'agent-made' }),
            }),
          })
        );
      });

      it('takes only what is about its own attachment, not what is about something else', async () => {
        const agent = makeAgentBuilder();
        setup({ path: '/create', agentBuilder: agent });
        await userEvent.click(await screen.findByTestId('customAppEmptyDescribe'));

        await act(async () => agent.answer('some-other-attachment', madeByTheAgent));

        expect(screen.queryByTestId('liveApp')).not.toBeInTheDocument();
        expect(screen.getByText('Build your app')).toBeInTheDocument();
      });

      it('ignores an app that is not valid, rather than break the page', async () => {
        const agent = makeAgentBuilder();
        setup({ path: '/create', agentBuilder: agent });
        await userEvent.click(await screen.findByTestId('customAppEmptyDescribe'));

        await act(async () =>
          agent.answer(attachedTo(agent).id, { state: {}, root: { type: 'carousel', id: 'x' } })
        );

        expect(screen.getByText('Build your app')).toBeInTheDocument();
      });

      it('offers to refine an app that has something in it, and sends it as it is', async () => {
        const agent = makeAgentBuilder();
        setup({ path: '/create', agentBuilder: agent });
        await applyAgentDraft();

        await userEvent.click(await findMenuItem('customAppRefineWithAi'));

        expect(agent.openChat).toHaveBeenCalledWith(
          expect.objectContaining({ initialMessage: 'Change this app so that ' })
        );
        expect(
          agent.openChat.mock.calls.at(-1)![0].attachments[0].data.document.root
        ).toMatchObject({
          id: 'edited',
        });
      });

      it('does not offer to refine an app that is empty, which is what describing it is for', async () => {
        setup({ path: '/create', agentBuilder: makeAgentBuilder() });
        await screen.findByText('Build your app');

        expect(await queryMenuItem('customAppRefineWithAi')).not.toBeInTheDocument();
      });
    });

    it('does not offer to describe it when chat is not available', async () => {
      setup({ path: '/create', agentBuilder: null });

      await screen.findByTestId('customAppEmptyExample');
      expect(screen.queryByTestId('customAppEmptyDescribe')).not.toBeInTheDocument();
    });

    it('makes the example the draft itself, ready to be saved', async () => {
      setup({ path: '/create' });

      await userEvent.click(await screen.findByTestId('customAppEmptyExample'));

      expect(await screen.findByTestId('liveApp')).toBeInTheDocument();
      expect(screen.queryByText('Build your app')).not.toBeInTheDocument();
      expect(screen.getByTestId('customAppSave')).toBeEnabled();
    });

    it('asks for a name only when Save is pressed, then saves it and opens it', async () => {
      const { client, history } = setup({ path: '/create' });
      client.create.mockResolvedValue(savedApp({ id: 'new-1', title: 'Fresh' }));
      await openEditor();
      await apply();

      await userEvent.click(screen.getByTestId('customAppSave'));
      expect(client.create).not.toHaveBeenCalled();
      await userEvent.type(screen.getByTestId('customAppDetailsTitle'), 'Fresh');
      await userEvent.click(screen.getByTestId('customAppDetailsConfirm'));

      await waitFor(() => expect(history.location.pathname).toBe('/view/new-1'));
      expect(client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fresh',
          document: expect.objectContaining({ root: expect.objectContaining({ id: 'edited' }) }),
        })
      );
      // Replaced, so that going back does not return to a new app.
      expect(history.length).toBe(1);
    });

    it('does not save an app without a name', async () => {
      setup({ path: '/create' });
      await openEditor();
      await apply();

      await userEvent.click(screen.getByTestId('customAppSave'));

      expect(screen.getByTestId('customAppDetailsConfirm')).toBeDisabled();
    });

    it('stays where it is, with the draft, when the name is not given', async () => {
      const { client } = setup({ path: '/create' });
      await openEditor();
      await apply();

      await userEvent.click(screen.getByTestId('customAppSave'));
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByTestId('customAppDetailsModal')).not.toBeInTheDocument();
      expect(screen.getByTestId('liveApp')).toHaveTextContent('edited');
      expect(client.create).not.toHaveBeenCalled();
    });

    it('says why, and keeps the draft, when it could not be saved', async () => {
      const { client, notifications, history } = setup({ path: '/create' });
      client.create.mockRejectedValue({ body: { message: 'Not allowed' } });
      await openEditor();
      await apply();

      await userEvent.click(screen.getByTestId('customAppSave'));
      await userEvent.type(screen.getByTestId('customAppDetailsTitle'), 'Fresh');
      await userEvent.click(screen.getByTestId('customAppDetailsConfirm'));

      await waitFor(() =>
        expect(notifications.toasts.addDanger).toHaveBeenCalledWith(
          expect.objectContaining({ text: 'Not allowed' })
        )
      );
      expect(history.location.pathname).toBe('/create');
      expect(screen.getByTestId('customAppDetailsModal')).toBeInTheDocument();
    });

    describe('leaving it with changes that are not saved', () => {
      it('asks first, and stays when the answer is no', async () => {
        const { history } = setup({ path: '/create', confirmLeave: false });
        await openEditor();
        await apply();

        act(() => history.push('/'));

        expect(history.location.pathname).toBe('/create');
      });

      it('leaves when the answer is yes', async () => {
        const { history } = setup({ path: '/create', confirmLeave: true });
        await openEditor();
        await apply();

        act(() => history.push('/'));

        expect(history.location.pathname).toBe('/');
      });

      it('asks the application to confirm leaving it, too', async () => {
        const { onAppLeave } = setup({ path: '/create' });
        await openEditor();
        await apply();

        const handler = onAppLeave.mock.calls.at(-1)?.[0];
        const confirm = jest.fn().mockReturnValue('confirm');
        expect(handler({ confirm, default: () => 'default' })).toBe('confirm');
        expect(confirm).toHaveBeenCalledWith(
          expect.stringContaining('unsaved changes'),
          'Unsaved changes'
        );
      });
    });
  });

  describe('refining a saved app with the assistant', () => {
    const attachedTo = (agent: ReturnType<typeof makeAgentBuilder>) =>
      agent.openChat.mock.calls[0][0].attachments[0];

    it('is offered for an app that has something in it, to someone who may change it', async () => {
      setup({ path: '/view/app-1', agentBuilder: makeAgentBuilder() });
      await screen.findByTestId('liveApp');

      expect(await findMenuItem('customAppRefineWithAi')).toBeInTheDocument();
    });

    it('is not offered when the assistant is not available', async () => {
      setup({ path: '/view/app-1', agentBuilder: null });
      await screen.findByTestId('liveApp');

      expect(await queryMenuItem('customAppRefineWithAi')).not.toBeInTheDocument();
    });

    it('is not offered to someone who may only read, who could not save what it makes', async () => {
      setup({ path: '/view/app-1', canSave: false, agentBuilder: makeAgentBuilder() });
      await screen.findByTestId('liveApp');

      expect(await queryMenuItem('customAppRefineWithAi')).not.toBeInTheDocument();
    });

    it('sends the app as it is saved, to be changed, with the start of a request', async () => {
      const agent = makeAgentBuilder();
      setup({ path: '/view/app-1', agentBuilder: agent });
      await screen.findByTestId('liveApp');

      await userEvent.click(await findMenuItem('customAppRefineWithAi'));

      expect(agent.openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          newConversation: true,
          initialMessage: 'Change this app so that ',
        })
      );
      expect(attachedTo(agent).data.document.root).toMatchObject({ id: 'title' });
    });

    it('shows what the agent makes as a change that is not saved, which Save then saves', async () => {
      const agent = makeAgentBuilder();
      const { client } = setup({ path: '/view/app-1', agentBuilder: agent });
      await screen.findByTestId('liveApp');
      await userEvent.click(await findMenuItem('customAppRefineWithAi'));

      await act(async () => agent.answer(attachedTo(agent).id, madeByTheAgent));

      await waitFor(() => expect(screen.getByTestId('liveApp')).toHaveTextContent('agent-made'));
      expect(screen.getByText('Unsaved')).toBeInTheDocument();
      expect(client.update).not.toHaveBeenCalled();

      await userEvent.click(screen.getByTestId('customAppSave'));
      await waitFor(() =>
        expect(client.update).toHaveBeenCalledWith(
          'app-1',
          expect.objectContaining({
            document: expect.objectContaining({
              root: expect.objectContaining({ id: 'agent-made' }),
            }),
          })
        )
      );
    });

    it('does not count an answer that changed nothing as a change', async () => {
      const agent = makeAgentBuilder();
      setup({ path: '/view/app-1', agentBuilder: agent });
      await screen.findByTestId('liveApp');
      await userEvent.click(await findMenuItem('customAppRefineWithAi'));

      await act(async () => agent.answer(attachedTo(agent).id, savedApp().document));

      expect(screen.queryByText('Unsaved')).not.toBeInTheDocument();
    });

    it('can be asked from the empty state of an empty app, and the answer fills it', async () => {
      const agent = makeAgentBuilder();
      setup({
        path: '/view/app-1',
        agentBuilder: agent,
        prepare: (client) =>
          client.get.mockResolvedValue(
            savedApp({
              document: {
                state: {},
                root: { type: 'stack', id: 'root', direction: 'vertical', children: [] },
              },
            })
          ),
      });
      await userEvent.click(await screen.findByTestId('customAppEmptyDescribe'));

      await act(async () => agent.answer(attachedTo(agent).id, madeByTheAgent));

      await waitFor(() => expect(screen.getByTestId('liveApp')).toHaveTextContent('agent-made'));
    });
  });

  describe('getting back to the list', () => {
    it('is a link at the top of the page of an app, which goes to the list', async () => {
      const { history } = setup({ path: '/view/app-1' });
      await screen.findByTestId('liveApp');

      await userEvent.click(screen.getByRole('link', { name: 'Back to Custom apps' }));

      expect(history.location.pathname).toBe('/');
    });

    it('is a link at the top of a new app too', async () => {
      const { history } = setup({ path: '/create' });
      await screen.findByText('Build your app');

      await userEvent.click(screen.getByRole('link', { name: 'Back to Custom apps' }));

      expect(history.location.pathname).toBe('/');
    });

    it('is a real link, so that it can be opened in another tab', async () => {
      setup({ path: '/view/app-1' });
      await screen.findByTestId('liveApp');

      expect(screen.getByRole('link', { name: 'Back to Custom apps' })).toHaveAttribute(
        'href',
        '/'
      );
    });

    it('asks first when a new app has changes that are not saved, and stays if told not to leave', async () => {
      const { history } = setup({ path: '/create', confirmLeave: false });
      await applyAgentDraft();

      await userEvent.click(screen.getByRole('link', { name: 'Back to Custom apps' }));

      expect(history.location.pathname).toBe('/create');
    });

    it('puts the list and the app in the breadcrumbs of Kibana as well', async () => {
      const { chrome } = setup({ path: '/view/app-1' });
      await screen.findByTestId('liveApp');

      const [breadcrumbs] = chrome.setBreadcrumbs.mock.calls.at(-1) as [Array<{ text: string }>];
      expect(breadcrumbs.map(({ text }) => text)).toEqual(['Custom apps', 'Service explorer']);
    });
  });

  describe('adding an app to a dashboard', () => {
    const open = async (options: Parameters<typeof setup>[0] = {}) => {
      const result = setup({ path: '/view/app-1', ...options });
      await screen.findByTestId('liveApp');
      return result;
    };

    it('is offered for an app that has something in it', async () => {
      await open();

      expect(await findMenuItem('customAppAddToDashboard')).toBeEnabled();
    });

    it('is not offered for an app that is empty, which would add a blank panel', async () => {
      setup({
        path: '/view/app-1',
        prepare: (client) =>
          client.get.mockResolvedValue(
            savedApp({
              document: {
                state: {},
                root: { type: 'stack', id: 'root', direction: 'vertical', children: [] },
              },
            })
          ),
      });
      await screen.findByText('Build your app');

      expect(screen.queryByTestId('customAppAddToDashboard')).not.toBeInTheDocument();
    });

    it('is offered to someone who may only read apps, since it does not change the app', async () => {
      await open({ canSave: false });

      expect(await findMenuItem('customAppAddToDashboard')).toBeEnabled();
    });

    it('is disabled for someone who may not change dashboards', async () => {
      await open({ canWriteDashboards: false });

      expect(await findMenuItem('customAppAddToDashboard')).toBeDisabled();
    });

    it('is disabled while there are changes that are not saved, as the dashboard shows the saved app', async () => {
      await open();
      await applyAgentDraft();

      await screen.findByTestId('customAppSave');
      expect(await findMenuItem('customAppAddToDashboard')).toBeDisabled();
    });

    it('adds a link to the app, not a copy, to the dashboard that is chosen', async () => {
      const { navigateToWithEmbeddablePackages } = await open();

      await userEvent.click(await findMenuItem('customAppAddToDashboard'));
      await userEvent.click(screen.getByRole('button', { name: 'confirm unchanged' }));

      expect(navigateToWithEmbeddablePackages).toHaveBeenCalledWith('dashboards', {
        state: [{ type: 'custom_app', serializedState: { ref_id: 'app-1' } }],
        path: '#/view/dash-1',
      });
    });

    it('gives the panel a title of its own only when it was changed in the dialog', async () => {
      const { navigateToWithEmbeddablePackages } = await open();

      await userEvent.click(await findMenuItem('customAppAddToDashboard'));
      await userEvent.click(screen.getByRole('button', { name: 'confirm renamed' }));

      expect(navigateToWithEmbeddablePackages).toHaveBeenCalledWith('dashboards', {
        state: [
          { type: 'custom_app', serializedState: { ref_id: 'app-1', title: 'Renamed here' } },
        ],
        path: '#/view/dash-1',
      });
    });

    it('opens a new dashboard with the panel when that is what was chosen', async () => {
      const { navigateToWithEmbeddablePackages } = await open();

      await userEvent.click(await findMenuItem('customAppAddToDashboard'));
      await userEvent.click(screen.getByRole('button', { name: 'confirm new dashboard' }));

      expect(navigateToWithEmbeddablePackages).toHaveBeenCalledWith(
        'dashboards',
        expect.objectContaining({ path: '#/create' })
      );
    });
  });

  describe('an app', () => {
    it('tells what shows the app which saved app it is, so that what it runs can be traced to it', async () => {
      setup({ path: '/view/app-1' });

      expect(await screen.findByTestId('liveApp')).toHaveAttribute('data-app-id', 'app-1');
    });

    it('shows the app with its name', async () => {
      setup({ path: '/view/app-1' });

      expect(await screen.findByTestId('liveApp')).toHaveTextContent('title');
      expect(screen.getByRole('heading', { name: 'Service explorer' })).toBeInTheDocument();
    });

    it('saves what was applied when Save is pressed, under the same name', async () => {
      const { client } = setup({ path: '/view/app-1' });
      await screen.findByTestId('liveApp');
      await applyAgentDraft();

      await userEvent.click(await screen.findByTestId('customAppSave'));

      await waitFor(() =>
        expect(client.update).toHaveBeenCalledWith(
          'app-1',
          expect.objectContaining({
            title: 'Service explorer',
            document: expect.objectContaining({ root: expect.objectContaining({ id: 'edited' }) }),
          })
        )
      );
      await waitFor(() => expect(screen.queryByText('Unsaved')).not.toBeInTheDocument());
      expect(screen.getByTestId('liveApp')).toHaveTextContent('edited');
    });

    it('keeps the draft, with a reason, when saving fails', async () => {
      const { client, notifications } = setup({ path: '/view/app-1' });
      client.update.mockRejectedValue({ body: { message: 'Conflict' } });
      await screen.findByTestId('liveApp');
      await applyAgentDraft();

      await userEvent.click(await screen.findByTestId('customAppSave'));

      await waitFor(() => expect(notifications.toasts.addDanger).toHaveBeenCalled());
      expect(screen.getByText('Unsaved')).toBeInTheDocument();
      expect(screen.getByTestId('liveApp')).toHaveTextContent('edited');
    });

    it('goes back to what is saved when the changes are discarded, after asking', async () => {
      setup({ path: '/view/app-1' });
      await screen.findByTestId('liveApp');
      await applyAgentDraft();

      fireEvent.click(await findMenuItem('customAppDiscard'));
      expect(screen.getByTestId('liveApp')).toHaveTextContent('edited');
      // The menu that was opened to ask is still closing, and its style stops a pointer, not a click.
      fireEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Discard changes' })
      );

      await waitFor(() => expect(screen.getByTestId('liveApp')).toHaveTextContent('title'));
      expect(screen.queryByText('Unsaved')).not.toBeInTheDocument();
    });

    it('leaves without asking when nothing is unsaved', async () => {
      const { history } = setup({ path: '/view/app-1', confirmLeave: false });
      await screen.findByTestId('liveApp');

      act(() => history.push('/'));
      expect(history.location.pathname).toBe('/');
    });

    it('stays when asked about unsaved changes and the answer is no', async () => {
      const { history } = setup({ path: '/view/app-1', confirmLeave: false });
      await screen.findByTestId('liveApp');
      await applyAgentDraft();
      await screen.findByTestId('customAppSave');

      act(() => history.push('/'));

      expect(history.location.pathname).toBe('/view/app-1');
    });

    describe('renaming it from the header', () => {
      const rename = async (name: string) => {
        await userEvent.click(await screen.findByTestId('appHeaderTitleButton'));
        const input = screen.getByTestId('appHeaderTitleInput');
        await userEvent.clear(input);
        await userEvent.type(input, `${name}{Enter}`);
      };

      it('saves the new name without touching the document', async () => {
        const { client } = setup({ path: '/view/app-1' });
        await screen.findByTestId('liveApp');

        await rename('Renamed');

        await waitFor(() =>
          expect(client.update).toHaveBeenCalledWith(
            'app-1',
            expect.objectContaining({
              title: 'Renamed',
              document: expect.objectContaining({ root: expect.objectContaining({ id: 'title' }) }),
            })
          )
        );
      });

      it('keeps what was changed and is not saved yet as it is, and saves only the name', async () => {
        const { client } = setup({ path: '/view/app-1' });
        await screen.findByTestId('liveApp');
        await applyAgentDraft();
        await screen.findByTestId('customAppSave');

        await rename('Renamed');

        await waitFor(() => expect(client.update).toHaveBeenCalledTimes(1));
        // The draft is not what is saved, and it is still there to be saved.
        expect(client.update.mock.calls[0][1].document).toEqual(
          (await client.get.mock.results[0].value).document
        );
        expect(screen.getByTestId('customAppSave')).toBeInTheDocument();
      });

      it('does not save a name that is empty, and says so', async () => {
        const { client } = setup({ path: '/view/app-1' });
        await screen.findByTestId('liveApp');

        await userEvent.click(await screen.findByTestId('appHeaderTitleButton'));
        await userEvent.clear(screen.getByTestId('appHeaderTitleInput'));
        await userEvent.type(screen.getByTestId('appHeaderTitleInput'), '   {Enter}');

        expect(await screen.findByTestId('appHeaderTitleError')).toBeInTheDocument();
        expect(client.update).not.toHaveBeenCalled();
      });

      it('does not save when the name is the same', async () => {
        const { client } = setup({ path: '/view/app-1' });
        await screen.findByTestId('liveApp');

        await rename('Service explorer');

        expect(client.update).not.toHaveBeenCalled();
      });

      it('stays open, with a reason, when the name could not be saved', async () => {
        const { client, notifications } = setup({
          path: '/view/app-1',
          prepare: (c) => c.update.mockRejectedValue({ body: { message: 'Not allowed' } }),
        });
        await screen.findByTestId('liveApp');

        await rename('Renamed');

        expect(await screen.findByText('The name could not be saved.')).toBeInTheDocument();
        expect(notifications.toasts.addDanger).toHaveBeenCalled();
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it('is not possible for someone who may only read', async () => {
        setup({ path: '/view/app-1', canSave: false });
        await screen.findByTestId('liveApp');

        expect(screen.queryByTestId('appHeaderTitleButton')).not.toBeInTheDocument();
        expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Service explorer');
      });
    });

    it('says what is wrong with an app that cannot be shown, instead of showing it broken', async () => {
      setup({
        path: '/view/app-1',
        prepare: (client) =>
          client.get.mockResolvedValue(
            savedApp({ document: { state: {}, root: { type: 'carousel', id: 'x' } } })
          ),
      });

      expect(await screen.findByText('This app cannot be shown')).toBeInTheDocument();
      expect(screen.queryByTestId('liveApp')).not.toBeInTheDocument();
    });

    describe('that is empty', () => {
      const empty = savedApp({
        document: {
          state: {},
          root: { type: 'stack', id: 'root', direction: 'vertical', children: [] },
        },
      });

      it('shows the empty state, with ways to begin, to those who may edit', async () => {
        setup({ path: '/view/app-1', prepare: (client) => client.get.mockResolvedValue(empty) });

        expect(await screen.findByText('Build your app')).toBeInTheDocument();
        expect(screen.getByTestId('customAppEmptyExample')).toBeInTheDocument();
      });

      it('only says it is empty, to those who may only read', async () => {
        setup({
          path: '/view/app-1',
          canSave: false,
          prepare: (client) => client.get.mockResolvedValue(empty),
        });

        expect(await screen.findByText('This app is empty')).toBeInTheDocument();
        expect(screen.queryByTestId('customAppEmptyExample')).not.toBeInTheDocument();
      });
    });

    it('says so when the app does not exist', async () => {
      setup({
        path: '/view/gone',
        prepare: (client) =>
          client.get.mockRejectedValue({ body: { statusCode: 404, message: 'Not found' } }),
      });

      expect(await screen.findByText(/does not exist, or you cannot see it/)).toBeInTheDocument();
    });
  });
});
