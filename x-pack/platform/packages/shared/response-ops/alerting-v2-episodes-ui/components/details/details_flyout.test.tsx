/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODE_ACTION_TYPE, type AlertEpisode } from '@kbn/alerting-v2-schemas';
import { FlyoutAccordion } from '@kbn/flyout-sections';
import { EDIT_EPISODE_ASSIGNEE_ACTION_ID } from '../../actions/edit_assignee';
import type { EpisodeAction } from '../../actions/types';
import { AlertEpisodeRunbookSection } from './runbook_section';
import { AlertEpisodeMetadataSection } from './metadata_section';
import { useEpisodeDetailsHeaderData } from '../../hooks/use_episode_details_header_data';
import type { RuleState } from '../../types/rule_state';
import { RuleStateStatus } from '../../types/rule_state';
import {
  createMockServices,
  createTestQueryClient,
  createQueryClientWrapper,
} from '../../hooks/test_utils';
import { AlertEpisodeDetailsFlyout } from './details_flyout';

jest.mock('../../hooks/use_episode_details_header_data');
jest.mock('../../hooks/use_invalidate_episode_queries', () => ({
  useInvalidateEpisodeQueries: () => jest.fn(),
}));

// Renders children so containment assertions still work, while recording props
// so the border can be asserted without depending on the accordion's own DOM.
jest.mock('@kbn/flyout-sections', () => ({
  FlyoutAccordion: jest.fn(
    ({ children, 'data-test-subj': testSubj }: Record<string, React.ReactNode>) => (
      <div data-test-subj={testSubj as string}>{children}</div>
    )
  ),
}));

jest.mock('./grouping_section', () => ({
  AlertEpisodeGroupingSection: () => <div data-test-subj="groupingSectionStub" />,
}));
jest.mock('./trend_chart_section', () => ({
  AlertEpisodeTrendChartSection: () => <div data-test-subj="trendChartSectionStub" />,
}));
jest.mock('./timeline_heatmaps_section', () => ({
  AlertEpisodeTimelineHeatmapsSection: () => <div data-test-subj="timelineHeatmapsSectionStub" />,
}));
jest.mock('./rule_overview_panel_section', () => ({
  AlertEpisodeRuleOverviewPanelSection: () => <div data-test-subj="ruleOverviewPanelSectionStub" />,
}));
jest.mock('./related_section', () => ({
  AlertEpisodesRelatedSection: jest.fn(() => <div data-test-subj="relatedSectionStub" />),
}));
jest.mock('./runbook_section', () => ({
  AlertEpisodeRunbookSection: jest.fn(() => <div data-test-subj="runbookSectionStub" />),
}));
jest.mock('./timeline_section', () => ({
  AlertEpisodeTimelineSection: () => <div data-test-subj="timelineSectionStub" />,
}));
jest.mock('./metadata_section', () => ({
  AlertEpisodeMetadataSection: jest.fn(() => (
    <div data-test-subj="metadataSectionStub">
      <div>
        <input type="search" />
      </div>
      <div>
        <button type="button" role="switch" aria-checked={false} />
      </div>
    </div>
  )),
}));

const mockUseEpisodeDetailsHeaderData = jest.mocked(useEpisodeDetailsHeaderData);
const mockFlyoutAccordion = jest.mocked(FlyoutAccordion);
const mockRunbookSection = jest.mocked(AlertEpisodeRunbookSection);
const mockMetadataSection = jest.mocked(AlertEpisodeMetadataSection);

const mockHttp = httpServiceMock.createStartContract();
const mockServices = createMockServices({ http: mockHttp });
const Wrapper = createQueryClientWrapper(createTestQueryClient());

// Cast to RuleState — the test only uses rule.metadata.name, so a partial rule object suffices.
const loadedRuleState = {
  status: RuleStateStatus.loaded,
  ruleId: 'rule-1',
  rule: { id: 'rule-1', metadata: { name: 'Rule A' } },
} as unknown as RuleState;

const mockGetRuleDetailsHref = (ruleId: string) => `/host-aware/rules/${ruleId}`;
const mockGetEpisodeDetailsHref = (episodeId: string) => `/host-aware/inbox/${episodeId}`;

const baseHeaderData = {
  isLoading: false,
  ruleState: loadedRuleState,
  episode: undefined,
  status: undefined,
  severity: null,
  episodeAction: undefined,
  groupAction: undefined,
  isFlapping: false,
};

const baseProps = {
  episodeId: 'ep-1',
  groupHash: 'gh-1',
  onClose: jest.fn(),
  services: mockServices,
  getRuleDetailsHref: mockGetRuleDetailsHref,
  getEpisodeDetailsHref: mockGetEpisodeDetailsHref,
};

const mockEpisode = { 'episode.id': 'ep-1', group_hash: 'gh-1' } as AlertEpisode;

/** Stands in for the real edit assignee action, which owns its own picker popover. */
const mockRenderInlineControl = jest.fn(() => <div data-test-subj="assigneeInlineControlStub" />);
const mockEditAssigneeAction = {
  id: EDIT_EPISODE_ASSIGNEE_ACTION_ID,
  order: 50,
  displayName: 'Edit assignee',
  iconType: 'user',
  isCompatible: () => true,
  execute: jest.fn(),
  renderInlineControl: mockRenderInlineControl,
} as unknown as EpisodeAction;

describe('AlertEpisodeDetailsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEpisodeDetailsHeaderData.mockReturnValue(baseHeaderData);
  });

  it('renders the flyout with the overview tab content by default', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    expect(screen.getByTestId('alertingV2EpisodeFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('groupingSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('timelineHeatmapsSectionStub')).toBeInTheDocument();
    // EUI hardcodes data-test-subj="euiFlyoutCloseButton" on the close button and ignores
    // closeButtonProps['data-test-subj'], so we assert the EUI default here.
    expect(screen.getByTestId('euiFlyoutCloseButton')).toBeInTheDocument();
  });

  it('exposes view details behind the footer take action menu', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    expect(screen.queryByTestId('alertingV2EpisodeTakeAction-viewDetails')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTakeActionButton'));

    expect(screen.getByTestId('alertingV2EpisodeTakeAction-viewDetails')).toHaveAttribute(
      'href',
      '/host-aware/inbox/ep-1'
    );
  });

  it('switches to the timeline tab', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTabTimeline'));
    expect(screen.getByTestId('timelineSectionStub')).toBeInTheDocument();
  });

  it('switches to the metadata tab when the rule is loaded', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTabMetadata'));
    expect(screen.getByTestId('metadataSectionStub')).toBeInTheDocument();
  });

  it('activates the document viewer flex layout and pads its semantic controls', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTabMetadata'));

    const metadataScope = screen.getByTestId('alertingV2EpisodeFlyoutMetadataScope');
    expect(metadataScope).toHaveStyleRule('padding-inline', '12px', {
      target: ":has(> input[type='search'])",
    });
    expect(metadataScope).toHaveStyleRule('padding-inline', '12px', {
      target: ":has(> button[role='switch'])",
    });
    expect(mockMetadataSection).toHaveBeenCalledWith(
      expect.objectContaining({ decreaseAvailableHeightBy: Number.MAX_SAFE_INTEGER }),
      expect.anything()
    );
  });

  it('hides the metadata tab when the rule is not loaded', () => {
    mockUseEpisodeDetailsHeaderData.mockReturnValue({
      ...baseHeaderData,
      ruleState: { status: RuleStateStatus.not_found, ruleId: 'rule-1' },
    });

    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    expect(screen.queryByTestId('alertingV2EpisodeFlyoutTabMetadata')).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows all three Overview accordions', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    expect(screen.getByTestId('alertingV2EpisodeFlyoutAccordionAbout')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeFlyoutAccordionInvestigation')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeFlyoutAccordionRule')).toBeInTheDocument();
  });

  it('holds the grouping, trend and timeline panels in the About accordion, in order', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    const about = screen.getByTestId('alertingV2EpisodeFlyoutAccordionAbout');
    expect(about).toContainElement(screen.getByTestId('groupingSectionStub'));
    expect(about).toContainElement(screen.getByTestId('trendChartSectionStub'));
    expect(about).toContainElement(screen.getByTestId('timelineHeatmapsSectionStub'));

    // Grouping, then trend, then the timelines.
    const grouping = screen.getByTestId('groupingSectionStub');
    const trend = screen.getByTestId('trendChartSectionStub');
    const timelines = screen.getByTestId('timelineHeatmapsSectionStub');
    expect(grouping.compareDocumentPosition(trend)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(trend.compareDocumentPosition(timelines)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // The overview list moved out to the header info blocks.
    expect(screen.queryByTestId('alertingV2EpisodeOverviewListSection')).not.toBeInTheDocument();
  });

  // The panels inside each accordion carry the border, so no accordion may add one
  // on top. Asserted on the prop rather than the DOM, since the accordions legitimately
  // contain panels of their own.
  it('turns off the border on every accordion', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    const rendered = mockFlyoutAccordion.mock.calls.map(([props]) => props);
    const borderedTitles = rendered
      .filter(({ hasBorder }) => hasBorder !== false)
      .map(({ title }) => title);

    // Counted as distinct titles, since re-renders repeat the same accordions.
    expect(new Set(rendered.map(({ title }) => title)).size).toBe(3);
    expect(borderedTitles).toEqual([]);
  });

  it('asks the runbook section for a titled, compressed preview with a full-guide link', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    expect(mockRunbookSection).toHaveBeenCalledWith(
      expect.objectContaining({
        compressed: true,
        showTitle: true,
        onShowFullGuide: expect.any(Function),
      }),
      expect.anything()
    );
  });

  it('opens the full runbook in its own flyout from the full-guide link', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    expect(screen.queryByTestId('alertingV2EpisodeRunbookFlyout')).not.toBeInTheDocument();

    const { onShowFullGuide } = mockRunbookSection.mock.calls.at(-1)![0];
    act(() => onShowFullGuide!());

    expect(screen.getByTestId('alertingV2EpisodeRunbookFlyout')).toBeInTheDocument();
  });

  it('closes only the runbook flyout, leaving the host to react to its own close', () => {
    const onClose = jest.fn();
    render(<AlertEpisodeDetailsFlyout {...baseProps} onClose={onClose} />, { wrapper: Wrapper });

    const { onShowFullGuide } = mockRunbookSection.mock.calls.at(-1)![0];
    act(() => onShowFullGuide!());

    fireEvent.click(
      within(screen.getByTestId('alertingV2EpisodeRunbookFlyout')).getByTestId(
        'euiFlyoutCloseButton'
      )
    );

    expect(screen.queryByTestId('alertingV2EpisodeRunbookFlyout')).not.toBeInTheDocument();
    // The runbook flyout does not close the host itself. In the real flyout manager the
    // episode flyout gets its own close with a cascade reason, which the Jest stub of
    // EuiFlyout cannot reproduce since it drops `session` entirely.
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the episode flyout mounted underneath the runbook flyout', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    const { onShowFullGuide } = mockRunbookSection.mock.calls.at(-1)![0];
    act(() => onShowFullGuide!());

    // Going back has to land on the episode flyout, so it must not unmount.
    // The manager-supplied back button is not assertable here: the Jest build of
    // EuiFlyout is a stub that drops `session` along with type/size/ownFocus, so no
    // manager session is ever created.
    expect(screen.getByTestId('alertingV2EpisodeFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeRunbookFlyout')).toBeInTheDocument();
  });

  it('renders Related and Runbook inside the Investigation accordion', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    expect(screen.getByTestId('relatedSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('runbookSectionStub')).toBeInTheDocument();
  });

  it('renders the severity header value as a colored dot with its label', () => {
    mockUseEpisodeDetailsHeaderData.mockReturnValue({ ...baseHeaderData, severity: 'high' });

    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    const severity = screen.getByTestId('alertingV2EpisodeFlyoutSeverity');
    expect(severity.querySelector('[data-euiicon-type="dot"]')).toBeInTheDocument();
    expect(severity).toHaveTextContent('High');
  });

  it('omits the severity header value when severity is unsupported', () => {
    mockUseEpisodeDetailsHeaderData.mockReturnValue({ ...baseHeaderData, severity: 'P2' });

    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

    expect(screen.queryByTestId('alertingV2EpisodeFlyoutSeverity')).not.toBeInTheDocument();
  });

  describe('assignee header value', () => {
    it('falls back to the assignee cell when the action is incompatible', () => {
      mockUseEpisodeDetailsHeaderData.mockReturnValue({
        ...baseHeaderData,
        episode: { ...mockEpisode, last_assignee_uid: null } as AlertEpisode,
      });
      const incompatibleAction = {
        ...mockEditAssigneeAction,
        isCompatible: () => false,
      } as EpisodeAction;

      render(<AlertEpisodeDetailsFlyout {...baseProps} actions={[incompatibleAction]} />, {
        wrapper: Wrapper,
      });

      expect(screen.queryByTestId('assigneeInlineControlStub')).not.toBeInTheDocument();
      expect(mockRenderInlineControl).not.toHaveBeenCalled();
    });

    it('renders the assignee control when the episode has no assignee', () => {
      mockUseEpisodeDetailsHeaderData.mockReturnValue({
        ...baseHeaderData,
        episode: { ...mockEpisode, last_assignee_uid: null } as AlertEpisode,
      });

      render(<AlertEpisodeDetailsFlyout {...baseProps} actions={[mockEditAssigneeAction]} />, {
        wrapper: Wrapper,
      });

      expect(screen.getByTestId('assigneeInlineControlStub')).toBeInTheDocument();
      expect(screen.queryByTestId('alertingV2EpisodeAssigneeCell')).not.toBeInTheDocument();
    });

    it('keeps hosting the control once assigned, so the assignee can be changed in place', () => {
      mockUseEpisodeDetailsHeaderData.mockReturnValue({
        ...baseHeaderData,
        episode: { ...mockEpisode, last_assignee_uid: 'user-1' } as AlertEpisode,
      });

      render(<AlertEpisodeDetailsFlyout {...baseProps} actions={[mockEditAssigneeAction]} />, {
        wrapper: Wrapper,
      });

      expect(screen.getByTestId('assigneeInlineControlStub')).toBeInTheDocument();
      expect(mockRenderInlineControl).toHaveBeenCalledWith(
        expect.objectContaining({
          episodes: [expect.objectContaining({ last_assignee_uid: 'user-1' })],
        })
      );
    });

    it('passes the episode and a refresh callback to the inline control', () => {
      mockUseEpisodeDetailsHeaderData.mockReturnValue({
        ...baseHeaderData,
        episode: { ...mockEpisode, last_assignee_uid: null } as AlertEpisode,
      });

      render(<AlertEpisodeDetailsFlyout {...baseProps} actions={[mockEditAssigneeAction]} />, {
        wrapper: Wrapper,
      });

      expect(mockRenderInlineControl).toHaveBeenCalledWith(
        expect.objectContaining({
          episodes: [expect.objectContaining({ 'episode.id': 'ep-1' })],
          onSuccess: expect.any(Function),
          isDisabled: false,
        })
      );
    });

    it('falls back to the assignee cell when the action is not supplied', () => {
      mockUseEpisodeDetailsHeaderData.mockReturnValue({
        ...baseHeaderData,
        episode: { ...mockEpisode, last_assignee_uid: null } as AlertEpisode,
      });

      render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });

      expect(screen.queryByTestId('assigneeInlineControlStub')).not.toBeInTheDocument();
    });
  });

  it('opens the flapping explanation from the header badge', async () => {
    const user = userEvent.setup();
    mockUseEpisodeDetailsHeaderData.mockReturnValue({ ...baseHeaderData, isFlapping: true });

    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });
    await user.click(screen.getByTestId('alertingV2EpisodeFlyoutFlappingBadgeTrigger'));

    expect(await screen.findByTestId('alertEpisodeFlappingPopover')).toBeInTheDocument();
  });

  it('shows the snooze expiry from the header badge', async () => {
    const user = userEvent.setup();
    mockUseEpisodeDetailsHeaderData.mockReturnValue({
      ...baseHeaderData,
      groupAction: {
        groupHash: 'group-1',
        ruleId: 'rule-1',
        lastDeactivateAction: null,
        lastSnoozeAction: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
        snoozeExpiry: '2035-06-15T14:30:00.000Z',
        tags: [],
        lastSnoozeActor: null,
        lastDeactivateActor: null,
      },
    });

    render(<AlertEpisodeDetailsFlyout {...baseProps} />, { wrapper: Wrapper });
    await user.hover(screen.getByTestId('alertingV2EpisodeFlyoutSnoozedBadgeTrigger'));

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(/snoozed until/i);
    expect(tooltip).toHaveTextContent(/2035/);
  });
});
