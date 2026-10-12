/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { appDocumentSchema, CUSTOM_APP_EMBEDDABLE_TYPE } from '@kbn/custom-app-common';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import { AppCard } from './app_card';
import { getServices } from '../services';

jest.mock('../services', () => ({ getServices: jest.fn() }));
jest.mock('./render_app', () => ({ RenderApp: () => <div data-test-subj="liveApp" /> }));
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

const setup = ({ canWrite = true, canSave = true } = {}) => {
  const navigate = jest.fn().mockResolvedValue(undefined);
  (getServices as jest.Mock).mockReturnValue({
    core: {
      application: { capabilities: { dashboard_v2: { showWriteControls: canWrite } } },
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
  return { navigate, buttons };
};

describe('the app card', () => {
  it('shows the live app', () => {
    setup();

    expect(screen.getByTestId('liveApp')).toBeInTheDocument();
  });

  it('offers to save to a dashboard, and nothing else', () => {
    const { buttons } = setup();

    expect(buttons()).toHaveLength(1);
    expect(buttons()[0]).toMatchObject({ label: 'Save to dashboard', disabled: false });
  });

  it('is disabled, with the reason, without dashboard write access', () => {
    const { buttons } = setup({ canWrite: false });

    expect(buttons()[0]).toMatchObject({ disabled: true });
    expect(buttons()[0].disabledReason).toContain('write permissions');
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
