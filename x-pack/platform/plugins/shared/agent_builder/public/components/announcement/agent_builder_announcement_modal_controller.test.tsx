/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject, of } from 'rxjs';
import { EuiProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { HIDE_ANNOUNCEMENTS_ID } from '@kbn/management-settings-ids';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common/telemetry';
import type { Capabilities } from '@kbn/core/public';

import { AgentBuilderAnnouncementModalController } from './agent_builder_announcement_modal_controller';

const SPACE_ID = 'test-space';

const capabilitiesAllowRevert: Capabilities = {
  navLinks: {},
  management: {},
  catalogue: {},
  advancedSettings: { save: true },
  observabilityAIAssistant: { show: true },
  securitySolutionAssistant: { 'ai-assistant': false },
  agentBuilder: { manageAgents: true },
};

function buildServices({
  hideAnnouncements = false,
  announcementSeenInProfile = false,
  spaceId = SPACE_ID,
  userProfileEnabled = true,
  agentBuilderSeenJson,
  chatExperienceCapabilities = capabilitiesAllowRevert,
}: {
  hideAnnouncements?: boolean;
  announcementSeenInProfile?: boolean;
  spaceId?: string;
  userProfileEnabled?: boolean;
  /** Overrides the JSON stored in user profile for per-space dismissal (default derives from announcementSeenInProfile). */
  agentBuilderSeenJson?: string;
  chatExperienceCapabilities?: Capabilities;
} = {}) {
  const space$ = new BehaviorSubject({ id: spaceId, name: spaceId });
  const reportEvent = jest.fn();
  const navigateToApp = jest.fn();
  const partialUpdate = jest.fn().mockResolvedValue(undefined);
  const seenJson =
    agentBuilderSeenJson ??
    (announcementSeenInProfile ? JSON.stringify({ [spaceId]: true }) : JSON.stringify({}));

  const userProfile = {
    getEnabled$: () => of(userProfileEnabled),
    getCurrent: jest.fn().mockResolvedValue({
      data: {
        userSettings: {
          agentBuilderAnnouncementModalSeenBySpaceJson: seenJson,
        },
      },
    }),
    partialUpdate,
  };

  const services = {
    settings: {
      client: {
        get: jest.fn(),
        get$: jest.fn(),
        set: jest.fn(),
      },
      globalClient: {
        get: (key: string) => (key === HIDE_ANNOUNCEMENTS_ID ? hideAnnouncements : undefined),
        get$: jest.fn(),
      },
    },
    spaces: {
      getActiveSpace$: () => space$.asObservable(),
    },
    analytics: { reportEvent },
    application: { navigateToApp, capabilities: chatExperienceCapabilities },
    userProfile,
  };

  return { services, reportEvent, navigateToApp, partialUpdate, userProfile, space$ };
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

  it('does not render the modal when running in an automated browser (navigator.webdriver)', async () => {
    Object.defineProperty(navigator, 'webdriver', {
      value: true,
      writable: true,
      configurable: true,
    });
    const { services } = buildServices();
    renderController(services);

    await waitFor(() => {
      expect(
        screen.queryByTestId('agentBuilderAnnouncementContinueButton')
      ).not.toBeInTheDocument();
    });

    Object.defineProperty(navigator, 'webdriver', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('does not render the modal when the user has already seen it in their profile', async () => {
    const { services } = buildServices({ announcementSeenInProfile: true });
    renderController(services);

    await waitFor(() => {
      expect(
        screen.queryByTestId('agentBuilderAnnouncementContinueButton')
      ).not.toBeInTheDocument();
    });
  });

  it('does not render the modal when user profiles are disabled', async () => {
    const { services } = buildServices({ userProfileEnabled: false });
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

  it('shows the modal after switching to a space where the announcement was not dismissed', async () => {
    const spaceA = 'space-a';
    const spaceB = 'space-b';
    const { services, space$ } = buildServices({
      spaceId: spaceA,
      agentBuilderSeenJson: JSON.stringify({ [spaceA]: true }),
    });
    renderController(services);

    await waitFor(() => {
      expect(
        screen.queryByTestId('agentBuilderAnnouncementContinueButton')
      ).not.toBeInTheDocument();
    });

    await act(async () => {
      space$.next({ id: spaceB, name: spaceB });
    });

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderAnnouncementContinueButton')).toBeInTheDocument();
    });
  });

  it('calls partialUpdate, reports OptInAction telemetry, and hides the modal on continue', async () => {
    const user = userEvent.setup();
    const { services, reportEvent, partialUpdate } = buildServices();
    renderController(services);

    await waitFor(() =>
      expect(screen.getByTestId('agentBuilderAnnouncementContinueButton')).toBeInTheDocument()
    );

    await user.click(screen.getByTestId('agentBuilderAnnouncementContinueButton'));

    await waitFor(() => {
      expect(partialUpdate).toHaveBeenCalledWith({
        userSettings: {
          agentBuilderAnnouncementModalSeenBySpaceJson: JSON.stringify({ [SPACE_ID]: true }),
        },
      });
    });
    expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
      action: 'confirmed',
      source: 'agent_builder_nav_control',
    });
    expect(screen.queryByTestId('agentBuilderAnnouncementContinueButton')).not.toBeInTheDocument();
  });

  it('calls partialUpdate, reports OptOut telemetry, navigates to GenAI settings, and hides the modal on revert', async () => {
    const user = userEvent.setup();
    const { services, reportEvent, navigateToApp, partialUpdate } = buildServices();
    renderController(services);

    await waitFor(() =>
      expect(screen.getByTestId('agentBuilderAnnouncementRevertButton')).toBeInTheDocument()
    );

    await user.click(screen.getByTestId('agentBuilderAnnouncementRevertButton'));

    await waitFor(() => {
      expect(partialUpdate).toHaveBeenCalled();
    });
    expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.OptOut, {
      source: 'agent_builder_nav_control',
    });
    expect(navigateToApp).toHaveBeenCalledWith('management', { path: '/ai/genAiSettings' });
    expect(screen.queryByTestId('agentBuilderAnnouncementRevertButton')).not.toBeInTheDocument();
  });

  it('does not show revert when the user cannot change space-level chat experience', async () => {
    const { services } = buildServices({
      chatExperienceCapabilities: {
        ...capabilitiesAllowRevert,
        advancedSettings: { save: false },
      },
    });
    renderController(services);

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderAnnouncementContinueButton')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('agentBuilderAnnouncementRevertButton')).not.toBeInTheDocument();
    expect(screen.queryByText('Need your history?')).not.toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderAnnouncementLearnMoreCallout')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderAnnouncementDocumentationLink')).toHaveAttribute(
      'href',
      'https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder'
    );
  });
});
