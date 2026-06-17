/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { DefaultLayout, FLEET_TAB_IDS } from './default';

let mockAppHeaderProps: Record<string, any> = {};

jest.mock('@kbn/app-header', () => ({
  AppHeader: (props: any) => {
    mockAppHeaderProps = props;
    return <div data-test-subj="mockAppHeader" />;
  },
}));

jest.mock('../../../../layouts', () => ({
  WithoutHeaderLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../../../hooks/use_dismissable_tour', () => ({
  useDismissableTour: () => ({ isOpen: false, isHidden: true, dismiss: jest.fn() }),
}));

jest.mock('../../../../hooks/use_tour_manager', () => ({
  TourManagerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../../hooks/use_can_enable_auto_upgrades', () => ({
  useCanEnableAutomaticAgentUpgrades: () => false,
}));

jest.mock('../../services', () => ({
  ExperimentalFeaturesService: { get: () => ({ enableOtelUI: false }) },
}));

const mockUseAuthz = jest.fn();
const mockUseConfig = jest.fn();
const mockUseLink = jest.fn();
const mockUseStartServices = jest.fn();

jest.mock('../../hooks', () => ({
  useAuthz: () => mockUseAuthz(),
  useConfig: () => mockUseConfig(),
  useLink: () => mockUseLink(),
  useStartServices: () => mockUseStartServices(),
}));

const defaultAuthz = {
  fleet: {
    all: true,
    readAgents: true,
    allAgents: true,
    readAgentPolicies: true,
    allAgentPolicies: true,
    allSettings: true,
    readSettings: true,
  },
};

const setupMocks = (authzOverrides?: Record<string, any>) => {
  mockUseAuthz.mockReturnValue({
    fleet: { ...defaultAuthz.fleet, ...authzOverrides },
  });
  mockUseConfig.mockReturnValue({ agents: { enabled: true } });
  mockUseLink.mockReturnValue({ getHref: () => '/mock-href' });
  mockUseStartServices.mockReturnValue({
    docLinks: { links: { fleet: { guide: 'https://docs', roleAndPrivileges: 'https://docs' } } },
  });
};

describe('DefaultLayout', () => {
  beforeEach(() => {
    mockAppHeaderProps = {};
  });

  describe('read-only badge', () => {
    it('shows read-only badge for agents section without allAgents', () => {
      setupMocks({ allAgents: false });
      render(<DefaultLayout section="agents" />);

      expect(mockAppHeaderProps.badges).toEqual(
        expect.arrayContaining([expect.objectContaining({ label: 'Read-only' })])
      );
    });

    it('shows read-only badge for agent_policies section without allAgentPolicies', () => {
      setupMocks({ allAgentPolicies: false });
      render(<DefaultLayout section="agent_policies" />);

      expect(mockAppHeaderProps.badges).toEqual(
        expect.arrayContaining([expect.objectContaining({ label: 'Read-only' })])
      );
    });

    it('shows read-only badge for settings section without allSettings', () => {
      setupMocks({ allSettings: false });
      render(<DefaultLayout section="settings" />);

      expect(mockAppHeaderProps.badges).toEqual(
        expect.arrayContaining([expect.objectContaining({ label: 'Read-only' })])
      );
    });

    it('does not show read-only badge when user has full privileges', () => {
      setupMocks();
      render(<DefaultLayout section="agents" />);

      expect(mockAppHeaderProps.badges).toEqual([]);
    });
  });

  describe('tab visibility', () => {
    it('hides agents tab when readAgents is false', () => {
      setupMocks({ readAgents: false });
      render(<DefaultLayout section="settings" />);

      const tabIds = mockAppHeaderProps.tabs.map((t: any) => t.id);
      expect(tabIds).not.toContain(FLEET_TAB_IDS.agents);
    });

    it('hides settings tab when readSettings is false', () => {
      setupMocks({ readSettings: false });
      render(<DefaultLayout section="agents" />);

      const tabIds = mockAppHeaderProps.tabs.map((t: any) => t.id);
      expect(tabIds).not.toContain(FLEET_TAB_IDS.settings);
    });

    it('shows all standard tabs with full privileges', () => {
      setupMocks();
      render(<DefaultLayout section="agents" />);

      const tabIds = mockAppHeaderProps.tabs.map((t: any) => t.id);
      expect(tabIds).toContain(FLEET_TAB_IDS.agents);
      expect(tabIds).toContain(FLEET_TAB_IDS.agentPolicies);
      expect(tabIds).toContain(FLEET_TAB_IDS.enrollmentTokens);
      expect(tabIds).toContain(FLEET_TAB_IDS.uninstallTokens);
      expect(tabIds).toContain(FLEET_TAB_IDS.dataStreams);
      expect(tabIds).toContain(FLEET_TAB_IDS.settings);
    });
  });
});
