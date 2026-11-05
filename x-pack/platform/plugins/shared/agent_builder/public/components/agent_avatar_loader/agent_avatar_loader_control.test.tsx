/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  getCustomPanelShimmer,
  getLoader,
  getNightshiftInvestigatingPreview,
  getNightshiftInvestigatingShimmer,
  getWorkersRunningPreview,
  setCustomPanelShimmer,
  setLoader,
  setNightshiftInvestigatingPreview,
  setNightshiftInvestigatingShimmer,
  setWorkersRunningPreview,
} from '@kbn/custom-content-renderer';
import { AgentAvatarLoaderControl } from './agent_avatar_loader_control';
import {
  getChatStatusShimmer,
  setChatStatusShimmer,
} from '../../application/components/conversations/timeline/chat_status_shimmer';

const renderControl = () =>
  render(
    <I18nProvider>
      <EuiProvider>
        <AgentAvatarLoaderControl />
      </EuiProvider>
    </I18nProvider>
  );

const resetLoaders = () => {
  window.localStorage.clear();
  setLoader('agentAvatar', 'orbitRing');
  setLoader('customPanel', 'scanDots');
  setLoader('workersRunning', 'pulseDots');
  setLoader('nightshift', 'scanDots');
  setCustomPanelShimmer(true);
  setChatStatusShimmer(true);
  setWorkersRunningPreview(false);
  setNightshiftInvestigatingPreview(false);
  setNightshiftInvestigatingShimmer(true);
};

describe('AgentAvatarLoaderControl', () => {
  beforeEach(() => {
    resetLoaders();
  });

  it('keeps a separate loader choice for the avatar and the custom panel', () => {
    renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Loaders' }));

    const avatarChoices = screen.getByTestId('loaderChoices-agentAvatar');
    const panelChoices = screen.getByTestId('loaderChoices-customPanel');
    expect(within(avatarChoices).getByRole('radio', { name: 'Orbit ring' })).toBeChecked();
    expect(within(avatarChoices).getByRole('radio', { name: 'Pulse dots' })).toBeInTheDocument();
    expect(within(avatarChoices).queryByRole('radio', { name: 'Scan' })).not.toBeInTheDocument();
    expect(
      within(panelChoices).queryByRole('radio', { name: 'Pulse dots' })
    ).not.toBeInTheDocument();
    expect(within(panelChoices).getByRole('radio', { name: 'Scan' })).toBeChecked();
    const workersChoices = screen.getByTestId('loaderChoices-workersRunning');
    expect(within(workersChoices).getByRole('radio', { name: 'Pulse dots' })).toBeChecked();
    expect(within(workersChoices).getByRole('radio', { name: 'Scan' })).toBeInTheDocument();

    fireEvent.click(within(avatarChoices).getByRole('radio', { name: 'Elastic logo' }));

    expect(getLoader('agentAvatar')).toBe('elastic');
    expect(getLoader('customPanel')).toBe('scanDots');
    expect(within(panelChoices).getByRole('radio', { name: 'Scan' })).toBeChecked();

    fireEvent.click(within(panelChoices).getByRole('radio', { name: 'Elastic logo' }));

    expect(getLoader('customPanel')).toBe('elastic');
    expect(getLoader('agentAvatar')).toBe('elastic');
  });

  it('turns shimmering text off for the custom panel', () => {
    renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Loaders' }));

    const avatarChoices = screen.getByTestId('loaderChoices-agentAvatar');
    const panelChoices = screen.getByTestId('loaderChoices-customPanel');
    expect(within(avatarChoices).getByTestId('chatStatusShimmerToggle')).toBeChecked();

    const shimmer = within(panelChoices).getByRole('switch');
    expect(within(panelChoices).getByText('Shimmering text')).toBeInTheDocument();
    expect(shimmer).toBeChecked();
    expect(getCustomPanelShimmer()).toBe(true);

    fireEvent.click(shimmer);

    expect(shimmer).not.toBeChecked();
    expect(getCustomPanelShimmer()).toBe(false);
    expect(getChatStatusShimmer()).toBe(true);
  });

  it('turns chat status shimmer off without changing the custom panel', () => {
    renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Loaders' }));

    const avatarChoices = screen.getByTestId('loaderChoices-agentAvatar');
    const chatShimmer = within(avatarChoices).getByTestId('chatStatusShimmerToggle');
    expect(within(avatarChoices).getByText('Shimmering text')).toBeInTheDocument();
    expect(chatShimmer).toBeChecked();
    expect(getChatStatusShimmer()).toBe(true);

    fireEvent.click(chatShimmer);

    expect(chatShimmer).not.toBeChecked();
    expect(getChatStatusShimmer()).toBe(false);
    expect(getCustomPanelShimmer()).toBe(true);
  });

  it('shows the workers running state from the workers group', () => {
    renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Loaders' }));

    const workersChoices = screen.getByTestId('loaderChoices-workersRunning');
    const action = within(workersChoices).getByRole('button', { name: 'Show workers running' });
    expect(getWorkersRunningPreview()).toBe(false);

    fireEvent.click(action);

    expect(getWorkersRunningPreview()).toBe(true);
    expect(
      within(workersChoices).getByRole('button', { name: 'Hide workers running' })
    ).toBeInTheDocument();
  });

  it('shows the Nightshift home as investigating from the Nightshift group', () => {
    renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Loaders' }));

    const nightshiftChoices = screen.getByTestId('loaderChoices-nightshift');
    expect(within(nightshiftChoices).getByRole('radio', { name: 'Scan' })).toBeChecked();
    const shimmer = within(nightshiftChoices).getByTestId('nightshiftInvestigatingShimmerToggle');
    expect(shimmer).toBeChecked();
    expect(getNightshiftInvestigatingShimmer()).toBe(true);

    fireEvent.click(shimmer);

    expect(shimmer).not.toBeChecked();
    expect(getNightshiftInvestigatingShimmer()).toBe(false);

    fireEvent.click(within(nightshiftChoices).getByRole('button', { name: 'Show investigating' }));

    expect(getNightshiftInvestigatingPreview()).toBe(true);
    expect(
      within(nightshiftChoices).getByRole('button', { name: 'Hide investigating' })
    ).toBeInTheDocument();
  });
});
