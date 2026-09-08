/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { EpisodeAddToChatButton } from '@kbn/alerting-v2-browser-shared';
import type { AlertEpisodeDetailsServices } from './types';
import { useFetchEpisodeQuery } from '../../hooks/use_fetch_episode_query';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { RuleStateStatus } from '../../types/rule_state';
import {
  createMockServices,
  createTestQueryClient,
  createQueryClientWrapper,
} from '../../hooks/test_utils';
import { AlertEpisodeDetailsFlyout } from './details_flyout';

jest.mock('../../hooks/use_fetch_rule');
jest.mock('../../hooks/use_fetch_episode_query');

jest.mock('@kbn/alerting-v2-browser-shared', () => ({
  ...jest.requireActual('@kbn/alerting-v2-browser-shared'),
  EpisodeAddToChatButton: jest.fn(() => <div data-test-subj="alertingV2EpisodeAddToChatButton" />),
}));

jest.mock('./details_header_section', () => ({
  AlertEpisodeDetailsHeaderSection: () => <div data-test-subj="headerSectionStub" />,
}));
jest.mock('./overview_section', () => ({
  AlertEpisodeOverviewSection: () => <div data-test-subj="overviewSectionStub" />,
}));
jest.mock('./related_section', () => ({
  AlertEpisodesRelatedSection: () => <div data-test-subj="relatedSectionStub" />,
}));
jest.mock('./metadata_section', () => ({
  AlertEpisodeMetadataSection: () => <div data-test-subj="metadataSectionStub" />,
}));
jest.mock('./runbook_section', () => ({
  AlertEpisodeRunbookSection: () => <div data-test-subj="runbookSectionStub" />,
}));

const mockUseFetchRule = jest.mocked(useFetchRule);
const mockUseFetchEpisodeQuery = jest.mocked(useFetchEpisodeQuery);
const mockEpisodeAddToChatButton = jest.mocked(EpisodeAddToChatButton);

const mockHttp = httpServiceMock.createStartContract();
const mockServices = createMockServices({ http: mockHttp });

const createAddToChatServices = (
  overrides: Partial<AlertEpisodeDetailsServices> = {}
): AlertEpisodeDetailsServices => {
  const application = applicationServiceMock.createStartContract();
  application.capabilities = {
    ...application.capabilities,
    agentBuilder: { show: true },
  };
  return createMockServices({
    http: mockHttp,
    application,
    agentBuilder: agentBuilderMocks.createStart(),
    ...overrides,
  });
};

const Wrapper = createQueryClientWrapper(createTestQueryClient());

const mockEpisode = {
  '@timestamp': '2026-01-01T00:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-01-01T00:00:00.000Z',
  last_timestamp: '2026-01-01T01:00:00.000Z',
  duration: 3600000,
} as AlertEpisode;

const loadedRuleState = {
  status: RuleStateStatus.loaded,
  ruleId: 'rule-1',
  rule: { id: 'rule-1', metadata: { name: 'Rule A' } },
} as const;

const baseProps = {
  episodeId: 'ep-1',
  groupHash: 'gh-1',
  onClose: jest.fn(),
  services: mockServices,
};

describe('AlertEpisodeDetailsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchRule.mockReturnValue({
      ruleState: loadedRuleState,
    } as ReturnType<typeof useFetchRule>);
    mockUseFetchEpisodeQuery.mockReturnValue({
      data: mockEpisode,
    } as ReturnType<typeof useFetchEpisodeQuery>);
  });

  it('renders header and the overview tab body by default', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });
    expect(screen.getByTestId('headerSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('overviewSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeFlyoutCloseIcon')).toBeInTheDocument();
  });

  it('exposes view details behind the footer take action menu', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    expect(screen.queryByTestId('alertingV2EpisodeTakeAction-viewDetails')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTakeActionButton'));

    expect(screen.getByTestId('alertingV2EpisodeTakeAction-viewDetails')).toHaveAttribute(
      'href',
      mockHttp.basePath.prepend('/app/management/alertingV2/episodes/ep-1')
    );
  });

  it('renders the add to chat button in the footer with the loaded episode and rule', () => {
    const services = createAddToChatServices();
    render(<AlertEpisodeDetailsFlyout {...baseProps} services={services} />, { wrapper: Wrapper });

    expect(mockEpisodeAddToChatButton).toHaveBeenCalledWith(
      expect.objectContaining({
        episode: mockEpisode,
        rule: loadedRuleState.rule,
        services,
      }),
      expect.anything()
    );
    expect(screen.getByTestId('alertingV2EpisodeAddToChatButton')).toBeInTheDocument();
  });

  it('omits the rule from add to chat when the rule is not loaded', () => {
    mockUseFetchRule.mockReturnValue({
      ruleState: { status: RuleStateStatus.not_found, ruleId: 'rule-1' },
    } as ReturnType<typeof useFetchRule>);

    render(<AlertEpisodeDetailsFlyout {...baseProps} services={createAddToChatServices()} />, {
      wrapper: Wrapper,
    });

    expect(mockEpisodeAddToChatButton).toHaveBeenCalledWith(
      expect.objectContaining({
        episode: mockEpisode,
        rule: undefined,
      }),
      expect.anything()
    );
  });

  it('does not render the add to chat button when the episode has not loaded', () => {
    mockUseFetchEpisodeQuery.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useFetchEpisodeQuery>);

    render(<AlertEpisodeDetailsFlyout {...baseProps} services={createAddToChatServices()} />, {
      wrapper: Wrapper,
    });

    expect(mockEpisodeAddToChatButton).not.toHaveBeenCalled();
    expect(screen.queryByTestId('alertingV2EpisodeAddToChatButton')).not.toBeInTheDocument();
  });

  it('does not render the add to chat button when agent builder is unavailable', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    expect(mockEpisodeAddToChatButton).not.toHaveBeenCalled();
    expect(screen.queryByTestId('alertingV2EpisodeAddToChatButton')).not.toBeInTheDocument();
  });

  it('does not render the add to chat button when the user lacks agent builder privilege', () => {
    const application = applicationServiceMock.createStartContract();
    application.capabilities = {
      ...application.capabilities,
      agentBuilder: { show: false },
    };

    render(
      <AlertEpisodeDetailsFlyout
        {...baseProps}
        services={createAddToChatServices({ application })}
      />,
      { wrapper: Wrapper }
    );

    expect(mockEpisodeAddToChatButton).not.toHaveBeenCalled();
    expect(screen.queryByTestId('alertingV2EpisodeAddToChatButton')).not.toBeInTheDocument();
  });

  it('switches to related tab', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTabRelated'));
    expect(screen.getByTestId('relatedSectionStub')).toBeInTheDocument();
  });

  it('switches to metadata tab when the rule is loaded', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTabMetadata'));
    expect(screen.getByTestId('metadataSectionStub')).toBeInTheDocument();
  });

  it('switches to runbook tab when the rule is loaded', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTabRunbook'));
    expect(screen.getByTestId('runbookSectionStub')).toBeInTheDocument();
  });

  it('hides metadata and runbook tabs when the rule is not loaded', () => {
    mockUseFetchRule.mockReturnValue({
      ruleState: { status: RuleStateStatus.not_found, ruleId: 'rule-1' },
    } as ReturnType<typeof useFetchRule>);

    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    expect(screen.queryByTestId('alertingV2EpisodeFlyoutTabMetadata')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertingV2EpisodeFlyoutTabRunbook')).not.toBeInTheDocument();
  });

  it('calls onClose when the footer close button is clicked', () => {
    const onClose = jest.fn();
    render(<AlertEpisodeDetailsFlyout {...baseProps} onClose={onClose} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the header close icon is clicked', () => {
    const onClose = jest.fn();
    render(<AlertEpisodeDetailsFlyout {...baseProps} onClose={onClose} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutCloseIcon'));
    expect(onClose).toHaveBeenCalled();
  });
});
