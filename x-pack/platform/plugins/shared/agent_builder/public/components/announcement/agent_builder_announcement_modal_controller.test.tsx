/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';
import { EuiProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { HIDE_ANNOUNCEMENTS_ID } from '@kbn/management-settings-ids';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common/telemetry';
import { AgentBuilderAnnouncementModalController } from './agent_builder_announcement_modal_controller';

const SPACE_ID = 'test-space';
const STORAGE_KEY = `agentBuilder.announcementModal.${SPACE_ID}`;

function buildServices({
  hideAnnouncements = false,
  spaceId = SPACE_ID,
}: {
  hideAnnouncements?: boolean;
  spaceId?: string;
} = {}) {
  const space$ = new BehaviorSubject({ id: spaceId, name: spaceId });
  const reportEvent = jest.fn();
  const navigateToApp = jest.fn();

  const services = {
    settings: {
      client: {
        get: (key: string) => (key === HIDE_ANNOUNCEMENTS_ID ? hideAnnouncements : undefined),
        get$: jest.fn(),
      },
    },
    spaces: {
      getActiveSpace$: () => space$.asObservable(),
    },
    analytics: { reportEvent },
    application: { navigateToApp },
  };

  return { services, reportEvent, navigateToApp };
}

function renderController(services: ReturnType<typeof buildServices>['services']) {
  return render(
    <IntlProvider locale="en">
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <AgentBuilderAnnouncementModalController />
        </KibanaContextProvider>
      </EuiProvider>
    </IntlProvider>
  );
}

describe('AgentBuilderAnnouncementModalController', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('does not render the modal when hideAnnouncements is true', async () => {
    const { services } = buildServices({ hideAnnouncements: true });
    renderController(services);

    await waitFor(() => {
      expect(
        screen.queryByTestId('agentBuilderAnnouncementContinueButton')
      ).not.toBeInTheDocument();
    });
  });

  it('does not render the modal when the user has already seen it', async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const { services } = buildServices();
    renderController(services);

    await waitFor(() => {
      expect(
        screen.queryByTestId('agentBuilderAnnouncementContinueButton')
      ).not.toBeInTheDocument();
    });
  });

  it('renders the modal when the space is loaded and the modal has not been seen', async () => {
    const { services } = buildServices();
    renderController(services);

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderAnnouncementContinueButton')).toBeInTheDocument();
    });
  });

  it('calls markAsSeen, reports OptInAction telemetry, and hides the modal on continue', async () => {
    const user = userEvent.setup();
    const { services, reportEvent } = buildServices();
    renderController(services);

    await waitFor(() =>
      expect(screen.getByTestId('agentBuilderAnnouncementContinueButton')).toBeInTheDocument()
    );

    await user.click(screen.getByTestId('agentBuilderAnnouncementContinueButton'));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
      action: 'confirmed',
      source: 'agent_builder_nav_control',
    });
    expect(screen.queryByTestId('agentBuilderAnnouncementContinueButton')).not.toBeInTheDocument();
  });

  it('calls markAsSeen, reports OptOut telemetry, navigates to management, and hides the modal on revert', async () => {
    const user = userEvent.setup();
    const { services, reportEvent, navigateToApp } = buildServices();
    renderController(services);

    await waitFor(() =>
      expect(screen.getByTestId('agentBuilderAnnouncementRevertButton')).toBeInTheDocument()
    );

    await user.click(screen.getByTestId('agentBuilderAnnouncementRevertButton'));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.OptOut, {
      source: 'agent_builder_nav_control',
    });
    expect(navigateToApp).toHaveBeenCalledWith('management', { path: '/ai/genAiSettings' });
    expect(screen.queryByTestId('agentBuilderAnnouncementRevertButton')).not.toBeInTheDocument();
  });
});
