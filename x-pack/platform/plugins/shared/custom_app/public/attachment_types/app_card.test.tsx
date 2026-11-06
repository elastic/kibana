/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema, CUSTOM_APP_EMBEDDABLE_TYPE } from '@kbn/custom-app-common';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import { AppCard } from './app_card';
import { getServices } from '../services';

jest.mock('../services', () => ({ getServices: jest.fn() }));
const createSaved = jest.fn();
jest.mock('../application/saved_apps_client', () => ({
  createSavedAppsClient: () => ({ create: createSaved }),
}));
jest.mock('../components/live_app', () => ({ LiveApp: () => <div data-test-subj="liveApp" /> }));
jest.mock('@kbn/presentation-util-plugin/public', () => ({
  SavedObjectSaveModalDashboard: ({
    onSave,
  }: {
    onSave: (params: { dashboardId?: string; newTitle: string; newDescription: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSave({ dashboardId: 'dash-1', newTitle: 'Saved title', newDescription: 'About' })
      }
    >
      {'confirm save'}
    </button>
  ),
}));

const document = appDocumentSchema.parse({ root: { type: 'heading', id: 'title', text: 'Hi' } });

const setup = ({ canWrite = true, canSave = true, canSaveApps = true } = {}) => {
  const navigateToApp = jest.fn();
  const addDanger = jest.fn();
  const navigate = jest.fn().mockResolvedValue(undefined);
  (getServices as jest.Mock).mockReturnValue({
    core: {
      http: {},
      notifications: { toasts: { addDanger } },
      application: {
        navigateToApp,
        capabilities: {
          dashboard_v2: { showWriteControls: canWrite },
          customApp: { save: canSaveApps },
        },
      },
    },
    embeddable: { getStateTransfer: () => ({ navigateToWithEmbeddablePackages: navigate }) },
  });
  const registerActionButtons = jest.fn();
  render(
    <AppCard
      document={document}
      canSave={canSave}
      title="Mine"
      registerActionButtons={registerActionButtons}
    />
  );
  const buttons = () => registerActionButtons.mock.calls.at(-1)?.[0] as ActionButton[];
  return { navigate, buttons, navigateToApp, addDanger };
};

describe('the app card', () => {
  it('shows the live app', () => {
    setup();

    expect(screen.getByTestId('liveApp')).toBeInTheDocument();
  });

  it('offers to save to a dashboard, and as an app', () => {
    const { buttons } = setup();

    expect(buttons().map(({ label }) => label)).toEqual(['Save to dashboard', 'Save as app']);
    expect(buttons()[0]).toMatchObject({ disabled: false });
    expect(buttons()[1]).toMatchObject({ disabled: false });
  });

  it('has no say in applying a version to a panel: it offers nothing of the kind', () => {
    const { buttons } = setup();

    expect(buttons().map(({ label }) => label.toLowerCase())).not.toContain('preview');
  });

  it('is disabled, with the reason, without dashboard write access', () => {
    const { buttons } = setup({ canWrite: false });

    expect(buttons()[0]).toMatchObject({ disabled: true });
    expect(buttons()[0].disabledReason).toContain('write permissions');
  });

  it('cannot be saved as an app without the privilege, and says which', () => {
    const { buttons } = setup({ canSaveApps: false });

    expect(buttons()[1]).toMatchObject({ label: 'Save as app', disabled: true });
    expect(buttons()[1].disabledReason).toContain('Custom apps privilege');
  });

  it('saves the app under the name given, then says so and offers to open it', async () => {
    const { buttons, navigateToApp } = setup();
    createSaved.mockResolvedValue({ id: 'saved-1', title: 'My app' });

    await act(async () => buttons()[1].handler());
    const name = screen.getByTestId('customAppDetailsTitle');
    await userEvent.clear(name);
    await userEvent.type(name, 'My app');
    await userEvent.click(screen.getByTestId('customAppDetailsConfirm'));

    expect(createSaved).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My app', document })
    );
    expect(await screen.findByText('Saved as "My app"')).toBeInTheDocument();
    expect(buttons().map(({ label }) => label)).toEqual(['Save to dashboard', 'Open app']);

    await act(async () => buttons()[1].handler());
    expect(navigateToApp).toHaveBeenCalledWith('customApp', { path: '/view/saved-1' });
  });

  it('starts the name from the title the agent gave the app', async () => {
    const { buttons } = setup();

    await act(async () => buttons()[1].handler());

    expect(screen.getByTestId('customAppDetailsTitle')).toHaveValue('Mine');
  });

  it('says why, and offers to save again, when the app could not be saved', async () => {
    const { buttons, addDanger } = setup();
    createSaved.mockRejectedValue({ body: { message: 'Not allowed' } });

    await act(async () => buttons()[1].handler());
    await userEvent.click(screen.getByTestId('customAppDetailsConfirm'));

    await waitFor(() =>
      expect(addDanger).toHaveBeenCalledWith(expect.objectContaining({ text: 'Not allowed' }))
    );
    expect(screen.queryByTestId('customAppSavedAsApp')).not.toBeInTheDocument();
    expect(buttons()[1].label).toBe('Save as app');
  });

  it('offers nothing for an app that came from a panel', () => {
    const { buttons } = setup({ canSave: false });

    expect(buttons()).toEqual([]);
  });

  it('sends the app to the chosen dashboard as a new panel, with the title given there', async () => {
    const { navigate, buttons } = setup();

    await act(async () => buttons()[0].handler());
    await act(async () => screen.getByText('confirm save').click());

    expect(navigate).toHaveBeenCalledWith('dashboards', {
      state: [
        {
          type: CUSTOM_APP_EMBEDDABLE_TYPE,
          serializedState: {
            version: 1,
            document,
            title: 'Saved title',
            description: 'About',
          },
        },
      ],
      path: '#/view/dash-1',
    });
  });
});
