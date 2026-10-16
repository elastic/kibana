/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  BUILTIN_PROFILES,
  DEFAULT_SIMPLE_MODE_DEFAULTS,
  NO_CUSTOM_DEFAULTS,
  createDefaultRules,
  translateSimpleDefaults,
} from '../../common/presets';
import type { BoostState, SimpleModeDefaults } from '../../common/types';
import { BoostPage } from './boost_page';

// The page header lives in Kibana's chrome, so a stand-in shows its title and mode switch.
jest.mock('@kbn/app-header', () => {
  const { createElement } = jest.requireActual('react');
  return {
    AppHeader: ({
      title,
      menu,
    }: {
      title: string;
      menu?: { switch?: { label: string; checked: boolean; onChange: (checked: boolean) => void } };
    }) =>
      createElement(
        'div',
        null,
        createElement('h1', null, title),
        menu?.switch &&
          createElement(
            'button',
            { onClick: () => menu.switch?.onChange(!menu.switch.checked) },
            menu.switch.label
          )
      ),
    AppHeaderLoading: () => null,
  };
});

jest.mock('../hooks/use_boost_services', () => ({
  useBoostServices: () => ({
    application: { capabilities: { boost: { save: true } } },
    appParams: { setBreadcrumbs: jest.fn() },
    chrome: { docTitle: { change: jest.fn() } },
    notifications: { toasts: { addSuccess: jest.fn() } },
  }),
}));

const createState = (simple: SimpleModeDefaults): BoostState => ({
  settings: { mode: 'simple', simple, custom_defaults: NO_CUSTOM_DEFAULTS },
  profiles: [...BUILTIN_PROFILES],
  rules: createDefaultRules(translateSimpleDefaults(simple)),
  suspended_rules: [],
  data_sources: [],
});

const mockState = createState(DEFAULT_SIMPLE_MODE_DEFAULTS);
const mockUpdateMode = jest.fn();
const mockSaveDefaults = jest.fn(
  (simple: SimpleModeDefaults, { onSuccess }: { onSuccess: (state: BoostState) => void }) =>
    onSuccess(createState(simple))
);

jest.mock('../hooks/use_boost_state', () => ({
  useBoostState: () => ({ data: mockState }),
  useUpdateMode: () => ({ mutate: mockUpdateMode, isLoading: false }),
  useUpdateSimpleDefaults: () => ({ mutate: mockSaveDefaults, isLoading: false }),
}));

const renderPage = () =>
  render(
    <IntlProvider locale="en">
      <MemoryRouter initialEntries={['/']}>
        <Route path="/:tab?" component={BoostPage} />
      </MemoryRouter>
    </IntlProvider>
  );

describe('BoostPage turning on advanced mode', () => {
  beforeEach(() => {
    mockUpdateMode.mockClear();
    mockSaveDefaults.mockClear();
  });

  it('turns it on right away without unsaved changes', async () => {
    renderPage();

    await userEvent.click(screen.getByTestId('enableAdvancedModeLink'));

    expect(screen.queryByTestId('boostUnsavedChangesModal')).not.toBeInTheDocument();
    expect(mockUpdateMode).toHaveBeenCalledWith('advanced', expect.anything());
  });

  it('asks about unsaved changes first, and saves them before turning it on', async () => {
    renderPage();

    await userEvent.click(screen.getByTestId('indicesPreset-on_demand'));
    await userEvent.click(screen.getByRole('button', { name: 'Advanced mode' }));

    expect(screen.getByTestId('boostUnsavedChangesModal')).toHaveTextContent(
      '1 unsaved setting change has been detected.'
    );
    expect(mockUpdateMode).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('boostUnsavedChangesSave'));

    expect(mockSaveDefaults).toHaveBeenCalledWith(
      { ...DEFAULT_SIMPLE_MODE_DEFAULTS, indices: 'on_demand' },
      expect.anything()
    );
    expect(mockUpdateMode).toHaveBeenCalledWith('advanced', expect.anything());
  });

  it('can discard the changes before turning it on', async () => {
    renderPage();

    await userEvent.click(screen.getByTestId('dataStreamsPreset-last_1_day'));
    await userEvent.click(screen.getByTestId('enableAdvancedModeLink'));
    await userEvent.click(screen.getByTestId('boostUnsavedChangesDiscard'));

    expect(mockSaveDefaults).not.toHaveBeenCalled();
    expect(mockUpdateMode).toHaveBeenCalledWith('advanced', expect.anything());
  });

  it('counts every changed setting', async () => {
    renderPage();

    await userEvent.click(screen.getByTestId('indicesPreset-on_demand'));
    await userEvent.click(screen.getByTestId('dataStreamsPreset-last_1_day'));
    await userEvent.click(screen.getByTestId('enableAdvancedModeLink'));

    expect(screen.getByTestId('boostUnsavedChangesModal')).toHaveTextContent(
      '2 unsaved setting changes have been detected.'
    );
  });

  it('keeps the changes and stays in simple mode when closed', async () => {
    renderPage();

    await userEvent.click(screen.getByTestId('indicesPreset-on_demand'));
    await userEvent.click(screen.getByTestId('enableAdvancedModeLink'));
    await userEvent.click(
      within(screen.getByTestId('boostUnsavedChangesModal')).getByRole('button', {
        name: /close/i,
      })
    );

    expect(mockUpdateMode).not.toHaveBeenCalled();
    expect(screen.queryByTestId('boostUnsavedChangesModal')).not.toBeInTheDocument();
    expect(screen.getByTestId('saveSimpleDefaults')).not.toHaveAttribute('aria-disabled', 'true');
  });
});
