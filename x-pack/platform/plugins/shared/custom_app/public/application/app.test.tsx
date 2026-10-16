/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import type { ScopedHistory } from '@kbn/core/public';
import { App } from './app';
import type { SavedApp, SavedAppsClient } from './saved_apps_client';

jest.mock('../components/live_app', () => ({
  LiveApp: ({ document }: { document: { root: { id: string } } }) => (
    <div data-test-subj="liveApp">{document.root.id}</div>
  ),
}));
jest.mock('../editor/editor_flyout', () => ({
  EditorFlyout: ({
    initialDocument,
    onSave,
    onCancel,
    onPreview,
  }: {
    initialDocument: { root: { id: string; children?: unknown[] } };
    onSave: (document: unknown) => void;
    onCancel: () => void;
    onPreview: (document: unknown) => void;
  }) => (
    <div
      data-test-subj="editor"
      data-starts-from={`${initialDocument.root.id}:${initialDocument.root.children?.length ?? 0}`}
    >
      <button
        type="button"
        onClick={() => onPreview({ state: {}, root: { type: 'text', id: 'draft', text: 'x' } })}
      >
        {'preview draft'}
      </button>
      <button
        type="button"
        onClick={() => onSave({ state: {}, root: { type: 'text', id: 'edited', text: 'x' } })}
      >
        {'save draft'}
      </button>
      <button type="button" onClick={onCancel}>
        {'cancel editor'}
      </button>
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

const setup = ({
  canSave = true,
  path = '/',
  prepare,
  describeWithChat,
  confirmLeave = true,
}: {
  /** What the person answers when asked whether to leave with unsaved changes. */
  confirmLeave?: boolean;
  describeWithChat?: (message: string) => void;
  canSave?: boolean;
  path?: string;
  /** Sets up what the client answers, before the page asks. */
  prepare?: (client: jest.Mocked<SavedAppsClient>) => void;
} = {}) => {
  const client = makeClient();
  const onAppLeave = jest.fn();
  prepare?.(client);
  const history = createMemoryHistory({
    initialEntries: [path],
    getUserConfirmation: (_message, callback) => callback(confirmLeave),
  });
  const notifications = { toasts: { addDanger: jest.fn() } };
  const chrome = { setBreadcrumbs: jest.fn() };
  render(
    <App
      history={history as unknown as ScopedHistory}
      client={client}
      chrome={chrome as never}
      notifications={notifications as never}
      canSave={canSave}
      describeWithChat={describeWithChat}
      onAppLeave={onAppLeave}
    />
  );
  return { client, history, notifications, chrome, onAppLeave };
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
    const openEditor = async () =>
      userEvent.click(await screen.findByTestId('customAppEmptyBuild'));
    const apply = async () =>
      userEvent.click(await screen.findByRole('button', { name: 'save draft' }));

    it('opens on an empty state and not on an example, with nothing saved', async () => {
      const { client } = setup({ path: '/create' });

      expect(await screen.findByText('Build your app')).toBeInTheDocument();
      expect(screen.queryByTestId('editor')).not.toBeInTheDocument();
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

    it('opens the editor on nothing when asked to build it', async () => {
      setup({ path: '/create' });

      await openEditor();

      expect(await screen.findByTestId('editor')).toHaveAttribute('data-starts-from', 'root:0');
    });

    it('opens the editor on the example when asked to start from it, and drops it if the editor is cancelled', async () => {
      setup({ path: '/create' });

      await userEvent.click(await screen.findByTestId('customAppEmptyExample'));
      const startsFrom = (await screen.findByTestId('editor')).getAttribute('data-starts-from');
      expect(startsFrom).toMatch(/^root:[1-9]/);

      await userEvent.click(screen.getByRole('button', { name: 'cancel editor' }));
      expect(screen.getByText('Build your app')).toBeInTheDocument();
    });

    it('opens chat with the start of a request when asked to describe it', async () => {
      const describeWithChat = jest.fn();
      setup({ path: '/create', describeWithChat });

      await userEvent.click(await screen.findByTestId('customAppEmptyDescribe'));

      expect(describeWithChat).toHaveBeenCalledWith('Create a custom app that ');
    });

    it('does not offer to describe it when chat is not available', async () => {
      setup({ path: '/create' });

      await screen.findByTestId('customAppEmptyBuild');
      expect(screen.queryByTestId('customAppEmptyDescribe')).not.toBeInTheDocument();
    });

    it('shows the draft as the editor changes it, in place of the empty state', async () => {
      setup({ path: '/create' });
      await openEditor();

      await userEvent.click(await screen.findByRole('button', { name: 'preview draft' }));

      expect(screen.getByTestId('liveApp')).toHaveTextContent('draft');
      expect(screen.queryByTestId('customAppEmpty')).not.toBeInTheDocument();
    });

    it('applies what the editor applies to the page, and no more: nothing is asked, nothing is saved', async () => {
      const { client } = setup({ path: '/create' });
      await openEditor();

      await apply();

      expect(screen.queryByTestId('editor')).not.toBeInTheDocument();
      expect(screen.queryByTestId('customAppDetailsModal')).not.toBeInTheDocument();
      expect(screen.getByTestId('liveApp')).toHaveTextContent('edited');
      expect(screen.getByText('Unsaved')).toBeInTheDocument();
      expect(screen.getByTestId('customAppSave')).toBeEnabled();
      expect(client.create).not.toHaveBeenCalled();
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

    it('goes back to the empty state, and leaves nothing behind, when the editor is cancelled', async () => {
      const { client, history } = setup({ path: '/create' });
      await openEditor();
      await userEvent.click(await screen.findByRole('button', { name: 'preview draft' }));

      await userEvent.click(screen.getByRole('button', { name: 'cancel editor' }));

      expect(screen.queryByTestId('editor')).not.toBeInTheDocument();
      expect(screen.getByText('Build your app')).toBeInTheDocument();
      expect(history.location.pathname).toBe('/create');
      expect(client.create).not.toHaveBeenCalled();
    });

    it('can be edited again after it was applied, starting from what was applied', async () => {
      setup({ path: '/create' });
      await openEditor();
      await apply();

      await userEvent.click(screen.getByTestId('customAppEdit'));

      expect(await screen.findByTestId('editor')).toHaveAttribute('data-starts-from', 'edited:0');
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

  describe('an app', () => {
    it('shows the app with its name', async () => {
      setup({ path: '/view/app-1' });

      expect(await screen.findByTestId('liveApp')).toHaveTextContent('title');
      expect(screen.getByRole('heading', { name: 'Service explorer' })).toBeInTheDocument();
    });

    it('shows a draft from the editor before it is saved, and the saved app again when it is left', async () => {
      const { client } = setup({ path: '/view/app-1' });
      await screen.findByTestId('liveApp');

      await userEvent.click(screen.getByTestId('customAppEdit'));
      await userEvent.click(screen.getByRole('button', { name: 'preview draft' }));
      expect(screen.getByTestId('liveApp')).toHaveTextContent('draft');

      await userEvent.click(screen.getByRole('button', { name: 'cancel editor' }));
      expect(screen.getByTestId('liveApp')).toHaveTextContent('title');
      expect(client.update).not.toHaveBeenCalled();
    });

    it('applies what the editor applies to the page without saving it, and says it is not saved', async () => {
      const { client } = setup({ path: '/view/app-1' });
      await screen.findByTestId('liveApp');

      await userEvent.click(screen.getByTestId('customAppEdit'));
      await userEvent.click(screen.getByRole('button', { name: 'save draft' }));

      await waitFor(() => expect(screen.queryByTestId('editor')).not.toBeInTheDocument());
      expect(screen.getByTestId('liveApp')).toHaveTextContent('edited');
      expect(screen.getByText('Unsaved')).toBeInTheDocument();
      expect(client.update).not.toHaveBeenCalled();
    });

    it('saves what was applied when Save is pressed, under the same name', async () => {
      const { client } = setup({ path: '/view/app-1' });
      await screen.findByTestId('liveApp');
      await userEvent.click(screen.getByTestId('customAppEdit'));
      await userEvent.click(screen.getByRole('button', { name: 'save draft' }));

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

    it('does not count an apply that changed nothing as a change', async () => {
      const { client } = setup({
        path: '/view/app-1',
        prepare: (c) =>
          c.get.mockResolvedValue(
            savedApp({ document: { state: {}, root: { type: 'text', id: 'edited', text: 'x' } } })
          ),
      });
      await screen.findByTestId('liveApp');

      await userEvent.click(screen.getByTestId('customAppEdit'));
      await userEvent.click(screen.getByRole('button', { name: 'save draft' }));

      await waitFor(() => expect(screen.queryByTestId('editor')).not.toBeInTheDocument());
      expect(screen.queryByText('Unsaved')).not.toBeInTheDocument();
      expect(client.update).not.toHaveBeenCalled();
    });

    it('keeps the draft, with a reason, when saving fails', async () => {
      const { client, notifications } = setup({ path: '/view/app-1' });
      client.update.mockRejectedValue({ body: { message: 'Conflict' } });
      await screen.findByTestId('liveApp');
      await userEvent.click(screen.getByTestId('customAppEdit'));
      await userEvent.click(screen.getByRole('button', { name: 'save draft' }));

      await userEvent.click(await screen.findByTestId('customAppSave'));

      await waitFor(() => expect(notifications.toasts.addDanger).toHaveBeenCalled());
      expect(screen.getByText('Unsaved')).toBeInTheDocument();
      expect(screen.getByTestId('liveApp')).toHaveTextContent('edited');
    });

    it('goes back to what is saved when the changes are discarded, after asking', async () => {
      setup({ path: '/view/app-1' });
      await screen.findByTestId('liveApp');
      await userEvent.click(screen.getByTestId('customAppEdit'));
      await userEvent.click(screen.getByRole('button', { name: 'save draft' }));

      await userEvent.click(await screen.findByTestId('customAppDiscard'));
      expect(screen.getByTestId('liveApp')).toHaveTextContent('edited');
      await userEvent.click(
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
      await userEvent.click(screen.getByTestId('customAppEdit'));
      await userEvent.click(screen.getByRole('button', { name: 'save draft' }));
      await screen.findByTestId('customAppSave');

      act(() => history.push('/'));

      expect(history.location.pathname).toBe('/view/app-1');
    });

    it('changes the name and description without touching the document', async () => {
      const { client } = setup({ path: '/view/app-1' });
      await screen.findByTestId('liveApp');

      await userEvent.click(screen.getByTestId('customAppEditDetails'));
      const title = screen.getByTestId('customAppDetailsTitle');
      await userEvent.clear(title);
      await userEvent.type(title, 'Renamed');
      await userEvent.click(screen.getByTestId('customAppDetailsConfirm'));

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

    it('cannot be edited by someone who may only read', async () => {
      setup({ path: '/view/app-1', canSave: false });
      await screen.findByTestId('liveApp');

      expect(screen.queryByTestId('customAppEdit')).not.toBeInTheDocument();
      expect(screen.queryByTestId('customAppEditDetails')).not.toBeInTheDocument();
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
      // Nothing to edit: an editor would start from a document that is not one.
      expect(screen.queryByTestId('customAppEdit')).not.toBeInTheDocument();
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
        await userEvent.click(screen.getByTestId('customAppEmptyBuild'));
        expect(await screen.findByTestId('editor')).toHaveAttribute('data-starts-from', 'root:0');
      });

      it('only says it is empty, to those who may only read', async () => {
        setup({
          path: '/view/app-1',
          canSave: false,
          prepare: (client) => client.get.mockResolvedValue(empty),
        });

        expect(await screen.findByText('This app is empty')).toBeInTheDocument();
        expect(screen.queryByTestId('customAppEmptyBuild')).not.toBeInTheDocument();
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
