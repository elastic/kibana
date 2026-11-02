/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { fetchClassicAlertById } from '../classic_alerts/apis/fetch_classic_alert_by_id';
import { CLASSIC_OBS_AND_STACK_RULE_TYPE_IDS } from '../classic_alerts/constants';
import { EpisodeDataSourceProvider } from '../context/episode_data_source_context';
import type { EpisodeDataSource } from '../types/episode_data_source';
import { classicActionExtensions } from '../classic_alerts/action_extensions';
import { classicAlertQueryKeys } from '../classic_alerts/query_keys';
import type { ClassicAlertFields } from '../classic_alerts/types';
import type { EpisodeAction } from '../actions';
import { createResolveAction } from '../actions/resolve';
import { createSnoozeAction } from '../actions/snooze';
import { createUnresolveAction } from '../actions/unresolve';
import { createUnsnoozeAction } from '../actions/unsnooze';
import { ClassicAlertDetailsFlyout } from './classic_alert_details_flyout';

jest.mock('../classic_alerts/apis/fetch_classic_alert_by_id');

const mockEuiFlyout = jest.fn();

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const react = jest.requireActual('react');
  return {
    ...actual,
    EuiFlyout: (props: Record<string, unknown>) => {
      mockEuiFlyout(props);
      return react.createElement(actual.EuiFlyout, props);
    },
  };
});

const forwardedFlyoutProps = () => mockEuiFlyout.mock.calls[mockEuiFlyout.mock.calls.length - 1][0];

const mockFetchClassicAlertById = jest.mocked(fetchClassicAlertById);

const mockHttpPost = jest.fn();

const services = {
  http: {
    basePath: { prepend: (path: string) => `/base${path}` },
    post: mockHttpPost,
  } as unknown as HttpStart,
};

/**
 * Classic (v1) alert documents used to exercise Take action.
 * Resolve writes `kibana.alert.status: untracked`. Snooze is not on the
 * document; it comes back from the rules muted-alerts API (`mockHttpPost`).
 */
const activeClassicAlert: ClassicAlertFields = {
  _index: '.internal.alerts-stack.alerts-default-000001',
  _id: 'alert-1',
  '@timestamp': '2026-04-23T00:00:00.000Z',
  'kibana.alert.uuid': 'alert-1',
  'kibana.alert.instance.id': 'instance-1',
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'CPU usage',
  'kibana.alert.rule.rule_type_id': '.index-threshold',
  'kibana.alert.status': 'active',
  'kibana.alert.start': '2026-04-23T00:00:00.000Z',
};

const resolvedClassicAlert: ClassicAlertFields = {
  ...activeClassicAlert,
  'kibana.alert.status': 'untracked',
};

const snoozedMutedAlertsResponse = {
  data: [
    {
      id: 'rule-1',
      muted_alert_instance_ids: ['instance-1'],
      snoozed_alert_instances: [
        {
          instance_id: 'instance-1',
          expires_at: '2099-01-01T00:00:00.000Z',
          snoozed_at: '2026-04-23T00:00:00.000Z',
          snoozed_by: 'user-1',
        },
      ],
    },
  ],
};

const extensionFor = (actionId: string) =>
  classicActionExtensions.find((extension) => extension.actionId === actionId);

const classicWorkflowActions = (): EpisodeAction[] => {
  const compositeDeps = {
    http: services.http,
    notifications: notificationServiceMock.createStartContract(),
  };
  return [
    createResolveAction(compositeDeps, extensionFor('ALERTING_V2_RESOLVE_EPISODE')),
    createUnresolveAction(compositeDeps),
    createSnoozeAction(
      {
        ...compositeDeps,
        overlays: overlayServiceMock.createStartContract(),
        rendering: renderingServiceMock.create(),
      },
      extensionFor('ALERTING_V2_SNOOZE_EPISODE')
    ),
    createUnsnoozeAction(compositeDeps, extensionFor('ALERTING_V2_UNSNOOZE_EPISODE')),
  ];
};

const openTakeActionMenu = async () => {
  fireEvent.click(await screen.findByTestId('alertingV2EpisodeFlyoutTakeActionButton'));
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

let queryClient = createQueryClient();

const createWrapper = () => {
  queryClient = createQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const renderFlyout = (props?: Partial<React.ComponentProps<typeof ClassicAlertDetailsFlyout>>) =>
  render(
    <ClassicAlertDetailsFlyout
      alertId="alert-1"
      onClose={jest.fn()}
      services={services}
      {...props}
    />,
    { wrapper: createWrapper() }
  );

describe('ClassicAlertDetailsFlyout', () => {
  beforeEach(() => {
    mockHttpPost.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('opens as a resizable overlay without stealing page focus', () => {
    mockFetchClassicAlertById.mockReturnValue(new Promise(() => {}));

    renderFlyout();

    expect(forwardedFlyoutProps()).toMatchObject({
      type: 'overlay',
      ownFocus: false,
      resizable: true,
    });
  });

  it('closes from the footer Close button in the loading, error and loaded states', async () => {
    const onClose = jest.fn();
    mockFetchClassicAlertById.mockReturnValue(new Promise(() => {}));
    const loading = renderFlyout({ onClose });

    fireEvent.click(screen.getByTestId('classicAlertEpisodeDetailsCloseButton'));
    expect(onClose).toHaveBeenCalledTimes(1);
    loading.unmount();

    mockFetchClassicAlertById.mockRejectedValue(new Error('not found'));
    const failed = renderFlyout({ onClose });
    await screen.findByTestId('classicAlertEpisodeDetailsError');

    fireEvent.click(screen.getByTestId('classicAlertEpisodeDetailsCloseButton'));
    expect(onClose).toHaveBeenCalledTimes(2);
    failed.unmount();

    mockFetchClassicAlertById.mockResolvedValue(activeClassicAlert);
    renderFlyout({ onClose });
    await screen.findByTestId('classicAlertEpisodeDetailsTabs');

    fireEvent.click(screen.getByTestId('classicAlertEpisodeDetailsCloseButton'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('shows a loading skeleton while the classic alert is being fetched', () => {
    mockFetchClassicAlertById.mockReturnValue(new Promise(() => {}));

    renderFlyout();

    expect(screen.getByTestId('classicAlertEpisodeDetailsLoading')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Loading classic alert' })).toBeInTheDocument();
  });

  it('renders the overview and fields tabs when the alert loads', async () => {
    mockFetchClassicAlertById.mockResolvedValue({
      _index: '.internal.alerts-observability.apm.alerts-default-000001',
      _id: 'alert-1',
      'kibana.alert.status': 'active',
      'kibana.alert.rule.name': 'CPU usage',
      'kibana.alert.rule.rule_type_id': 'apm.error_rate',
      'kibana.alert.severity': 'critical',
      'kibana.alert.reason': 'CPU is high',
      'kibana.alert.duration.us': 120_000_000,
      'kibana.alert.rule.tags': ['prod', 'cpu'],
    });

    renderFlyout();

    await waitFor(() => {
      expect(screen.getByTestId('classicAlertEpisodeDetailsTabs')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'CPU usage' })).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('CPU is high')).toBeInTheDocument();
    expect(screen.getByText('2 min')).toBeInTheDocument();
    expect(screen.getByText('prod, cpu')).toBeInTheDocument();

    expect(screen.getByTestId('classicAlertEpisodeFieldsTab')).toBeInTheDocument();

    await openTakeActionMenu();
    const viewDetails = await screen.findByTestId('alertingV2EpisodeTakeAction-viewDetails');
    expect(viewDetails).toHaveAttribute('href', '/base/app/observability/alerts/alert-1');
    expect(viewDetails).not.toHaveAttribute('target');
    expect(viewDetails).toHaveTextContent('View details');
  });

  it('omits the take action menu for non-observability (stack) alerts without actions', async () => {
    mockFetchClassicAlertById.mockResolvedValue({
      _index: '.internal.alerts-stack.alerts-default-000001',
      _id: 'alert-1',
      'kibana.alert.status': 'active',
      'kibana.alert.rule.name': 'Stack rule',
      'kibana.alert.rule.rule_type_id': '.index-threshold',
    });

    renderFlyout();

    await waitFor(() => {
      expect(screen.getByTestId('classicAlertEpisodeDetailsTabs')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('alertingV2EpisodeFlyoutTakeActionButton')).not.toBeInTheDocument();
  });

  it('leaves View details out of the take action menu for rule types without an observability details page', async () => {
    mockFetchClassicAlertById.mockResolvedValue(activeClassicAlert);

    renderFlyout({ actions: classicWorkflowActions() });
    await openTakeActionMenu();

    expect(
      await screen.findByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_SNOOZE_EPISODE')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('alertingV2EpisodeTakeAction-viewDetails')).not.toBeInTheDocument();
  });

  it('renders an error state when the fetch fails', async () => {
    mockFetchClassicAlertById.mockRejectedValue(new Error('not found'));

    renderFlyout();

    await waitFor(() => {
      expect(screen.getByTestId('classicAlertEpisodeDetailsError')).toBeInTheDocument();
    });
  });

  it('drops the take action menu and tabs when a refetch fails after a successful load', async () => {
    mockFetchClassicAlertById.mockResolvedValue({
      ...activeClassicAlert,
      _index: '.internal.alerts-observability.apm.alerts-default-000001',
      'kibana.alert.rule.rule_type_id': 'apm.error_rate',
    });

    renderFlyout({ actions: classicWorkflowActions() });
    expect(
      await screen.findByTestId('alertingV2EpisodeFlyoutTakeActionButton')
    ).toBeInTheDocument();

    mockFetchClassicAlertById.mockRejectedValue(new Error('not found'));
    await queryClient.refetchQueries({ queryKey: classicAlertQueryKeys.alert('alert-1') });

    await waitFor(() => {
      expect(screen.getByTestId('classicAlertEpisodeDetailsError')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('alertingV2EpisodeFlyoutTakeActionButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('classicAlertEpisodeDetailsTabs')).not.toBeInTheDocument();
  });

  it('renders the take action menu when actions are provided', async () => {
    const mockAction = {
      id: 'test-action',
      order: 1,
      displayName: 'Test Action',
      iconType: 'star',
      isCompatible: jest.fn(() => true),
      execute: jest.fn(async () => {}),
    };

    mockFetchClassicAlertById.mockResolvedValue({
      _index: '.internal.alerts-observability.apm.alerts-default-000001',
      _id: 'alert-1',
      'kibana.alert.uuid': 'alert-1',
      'kibana.alert.status': 'active',
      'kibana.alert.rule.name': 'CPU usage',
      'kibana.alert.rule.rule_type_id': 'apm.error_rate',
    });

    renderFlyout({ actions: [mockAction] });

    await waitFor(() => {
      expect(screen.getByTestId('classicAlertEpisodeDetailsTabs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTakeActionButton'));
    expect(
      await screen.findByTestId('alertingV2EpisodeFlyoutTakeActionButtonPanel')
    ).toBeInTheDocument();
    expect(mockAction.isCompatible).toHaveBeenCalledWith({
      episodes: [expect.objectContaining({ source_id: 'v1' })],
    });
  });

  it('lists View details first, then the workflow actions, for observability rule types', async () => {
    mockFetchClassicAlertById.mockResolvedValue({
      ...activeClassicAlert,
      _index: '.internal.alerts-observability.apm.alerts-default-000001',
      'kibana.alert.rule.rule_type_id': 'apm.error_rate',
    });

    renderFlyout({ actions: classicWorkflowActions() });
    await openTakeActionMenu();

    const panel = await screen.findByTestId('alertingV2EpisodeFlyoutTakeActionButtonPanel');
    const itemSubjects = Array.from(
      panel.querySelectorAll('[data-test-subj^="alertingV2EpisodeTakeAction-"]')
    ).map((item) => item.getAttribute('data-test-subj'));
    expect(itemSubjects).toEqual([
      'alertingV2EpisodeTakeAction-viewDetails',
      'alertingV2EpisodeTakeAction-ALERTING_V2_RESOLVE_EPISODE',
      'alertingV2EpisodeTakeAction-ALERTING_V2_SNOOZE_EPISODE',
    ]);
    expect(panel.querySelectorAll('.euiHorizontalRule')).toHaveLength(1);
  });

  it('keeps a take action menu with only View details for observability rule types without compatible actions', async () => {
    mockFetchClassicAlertById.mockResolvedValue({
      ...activeClassicAlert,
      _index: '.internal.alerts-observability.apm.alerts-default-000001',
      'kibana.alert.rule.rule_type_id': 'apm.error_rate',
    });
    const incompatible = {
      id: 'incompatible-action',
      order: 1,
      displayName: 'Incompatible',
      iconType: 'star',
      isCompatible: () => false,
      execute: jest.fn(async () => {}),
    };

    renderFlyout({ actions: [incompatible] });
    await openTakeActionMenu();

    const panel = await screen.findByTestId('alertingV2EpisodeFlyoutTakeActionButtonPanel');
    expect(
      Array.from(panel.querySelectorAll('[data-test-subj^="alertingV2EpisodeTakeAction-"]')).map(
        (item) => item.getAttribute('data-test-subj')
      )
    ).toEqual(['alertingV2EpisodeTakeAction-viewDetails']);
  });

  it('disables Unresolve for a resolved classic alert, matching the alerts table', async () => {
    mockFetchClassicAlertById.mockResolvedValue(resolvedClassicAlert);

    renderFlyout({ actions: classicWorkflowActions() });
    await openTakeActionMenu();

    const unresolve = screen.getByTestId(
      'alertingV2EpisodeTakeAction-ALERTING_V2_UNRESOLVE_EPISODE'
    );
    expect(unresolve).toHaveTextContent('Unresolve');
    expect(unresolve).toBeDisabled();
    expect(
      screen.queryByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_RESOLVE_EPISODE')
    ).not.toBeInTheDocument();
  });

  it('offers Snooze, not Unsnooze, for an active classic alert that is not snoozed', async () => {
    mockFetchClassicAlertById.mockResolvedValue(activeClassicAlert);

    renderFlyout({ actions: classicWorkflowActions() });
    await openTakeActionMenu();

    expect(
      screen.getByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_SNOOZE_EPISODE')
    ).toBeEnabled();
    expect(
      screen.queryByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_UNSNOOZE_EPISODE')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_UNRESOLVE_EPISODE')
    ).not.toBeInTheDocument();
  });

  it('switches the take action menu to Unsnooze after a classic alert is snoozed', async () => {
    mockFetchClassicAlertById.mockResolvedValue(activeClassicAlert);

    renderFlyout({ actions: classicWorkflowActions() });
    await openTakeActionMenu();
    expect(
      screen.getByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_SNOOZE_EPISODE')
    ).toBeInTheDocument();

    mockHttpPost.mockResolvedValue(snoozedMutedAlertsResponse);
    await queryClient.invalidateQueries({ queryKey: classicAlertQueryKeys.alert('alert-1') });

    await waitFor(() => {
      expect(
        screen.getByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_UNSNOOZE_EPISODE')
      ).toBeEnabled();
    });
    expect(
      screen.queryByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_SNOOZE_EPISODE')
    ).not.toBeInTheDocument();
  });

  describe('rule type scope', () => {
    const renderWithSource = (dataSource?: Partial<EpisodeDataSource>) =>
      render(
        <EpisodeDataSourceProvider dataSource={dataSource as EpisodeDataSource}>
          <ClassicAlertDetailsFlyout alertId="alert-1" onClose={jest.fn()} services={services} />
        </EpisodeDataSourceProvider>,
        { wrapper: createWrapper() }
      );

    it('looks the alert up within the rule types the injected source covers', async () => {
      mockFetchClassicAlertById.mockResolvedValue(undefined as never);

      renderWithSource({ ruleTypeIds: ['siem.esqlRule'] } as Partial<EpisodeDataSource>);

      await waitFor(() =>
        expect(mockFetchClassicAlertById).toHaveBeenCalledWith(
          expect.objectContaining({ ruleTypeIds: ['siem.esqlRule'] })
        )
      );
    });

    it('falls back to the Observability and stack rule types when a source declares none', async () => {
      mockFetchClassicAlertById.mockResolvedValue(undefined as never);

      renderWithSource({});

      await waitFor(() =>
        expect(mockFetchClassicAlertById).toHaveBeenCalledWith(
          expect.objectContaining({ ruleTypeIds: CLASSIC_OBS_AND_STACK_RULE_TYPE_IDS })
        )
      );
    });
  });
});
