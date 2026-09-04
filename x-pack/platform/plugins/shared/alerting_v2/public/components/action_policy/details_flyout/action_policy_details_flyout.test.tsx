/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ActionPolicyDetailsFlyout } from './action_policy_details_flyout';

const ELASTIC_UID = 'elastic_uid';

const mockBulkGet = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return {
        getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
      };
    }
    if (token === 'settings') {
      return {
        client: { get: () => 'YYYY-MM-DD HH:mm' },
      };
    }
    if (token === 'userProfile') {
      return { bulkGet: mockBulkGet };
    }
    if (token === 'http') {
      return {
        basePath: { prepend: (path: string) => `/base${path}` },
      };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('../../../hooks/use_fetch_workflow', () => ({
  useFetchWorkflow: (id: string) => ({
    data: { id, name: `Workflow ${id}` },
    isLoading: false,
  }),
}));

const TEST_SUBJ = {
  flyout: 'actionPolicyDetailsFlyout',
  title: 'actionPolicyDetailsFlyoutTitle',
  closeButton: 'detailsFlyoutCloseButton',
  closeIcon: 'detailsFlyoutCloseIcon',
  takeActionButton: 'detailsFlyoutTakeActionButton',
} as const;

const futureIso = (): string => new Date(Date.now() + 1000 * 60 * 60).toISOString();

const createPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse => ({
  id: 'policy-1',
  version: 'v1',
  name: 'Critical alerts policy',
  description: 'Routes critical alerts to the oncall workflow',
  enabled: true,
  destinations: [
    { type: 'workflow', id: 'wf-1' },
    { type: 'workflow', id: 'wf-2' },
  ],
  matcher: 'data.severity : "critical"',
  group_by: ['host.name', 'service.name'],
  tags: ['production', 'oncall'],
  grouping_mode: 'per_field',
  throttle: { strategy: 'time_interval', interval: '5m' },
  snoozed_until: null,
  auth: { owner: 'elastic', created_by_user: true },
  created_by: ELASTIC_UID,
  created_at: '2026-03-01T10:00:00.000Z',
  updated_by: ELASTIC_UID,
  updated_at: '2026-03-02T11:00:00.000Z',
  ...overrides,
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

interface RenderProps {
  policy?: ActionPolicyResponse;
  canWrite?: boolean;
  onClose?: jest.Mock;
  onEdit?: jest.Mock;
  onClone?: jest.Mock;
  onDelete?: jest.Mock;
  onEnable?: jest.Mock;
  onDisable?: jest.Mock;
  onSnooze?: jest.Mock;
  onCancelSnooze?: jest.Mock;
  onUpdateApiKey?: jest.Mock;
}

const renderFlyout = (props: RenderProps = {}) => {
  const policy = props.policy ?? createPolicy();
  const handlers = {
    onClose: props.onClose ?? jest.fn(),
    onEdit: props.onEdit ?? jest.fn(),
    onClone: props.onClone ?? jest.fn(),
    onDelete: props.onDelete ?? jest.fn(),
    onEnable: props.onEnable ?? jest.fn(),
    onDisable: props.onDisable ?? jest.fn(),
    onSnooze: props.onSnooze ?? jest.fn(),
    onCancelSnooze: props.onCancelSnooze ?? jest.fn(),
    onUpdateApiKey: props.onUpdateApiKey ?? jest.fn(),
  };

  render(
    <QueryClientProvider client={createQueryClient()}>
      <I18nProvider>
        <ActionPolicyDetailsFlyout
          policy={policy}
          canWrite={props.canWrite ?? true}
          {...handlers}
        />
      </I18nProvider>
    </QueryClientProvider>
  );

  return { policy, handlers };
};

describe('ActionPolicyDetailsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBulkGet.mockResolvedValue([
      { uid: ELASTIC_UID, user: { username: 'elastic', full_name: 'Elastic User' } },
    ]);
  });

  describe('header', () => {
    it('renders the policy name and enabled state badge', () => {
      renderFlyout();

      expect(screen.getByTestId(TEST_SUBJ.flyout)).toBeInTheDocument();
      expect(screen.getByTestId(TEST_SUBJ.title)).toHaveTextContent('Critical alerts policy');
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    it('renders a disabled state badge when the policy is disabled', () => {
      renderFlyout({ policy: createPolicy({ enabled: false }) });

      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('renders a snoozed-until chip when the policy is actively snoozed (regardless of canWrite)', () => {
      renderFlyout({ policy: createPolicy({ snoozed_until: futureIso() }) });
      expect(screen.getByText(/Snoozed until/i)).toBeInTheDocument();
    });

    it('renders a snoozed-until chip for readers when the policy is actively snoozed', () => {
      renderFlyout({ canWrite: false, policy: createPolicy({ snoozed_until: futureIso() }) });
      expect(screen.getByText(/Snoozed until/i)).toBeInTheDocument();
    });

    it('does not render a snoozed-until chip when snoozedUntil is null or in the past', () => {
      renderFlyout({ canWrite: false, policy: createPolicy({ snoozed_until: null }) });
      expect(screen.queryByText(/Snoozed until/i)).not.toBeInTheDocument();
    });

    it('does not render the snooze bell or the header kebab menu', () => {
      renderFlyout();

      expect(screen.queryByTestId('actionPolicySnoozeButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('actionPolicyUnsnoozeButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('detailsFlyoutActionsMenuButton')).not.toBeInTheDocument();
    });

    it('keeps the close icon in the header', () => {
      renderFlyout();
      expect(screen.getByTestId(TEST_SUBJ.closeIcon)).toBeInTheDocument();
    });

    it('calls onClose when the close icon is clicked', () => {
      const { handlers } = renderFlyout();
      fireEvent.click(screen.getByTestId(TEST_SUBJ.closeIcon));
      expect(handlers.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('body sections', () => {
    it('renders all basic information fields for a fully-populated policy', () => {
      renderFlyout();

      expect(screen.getByText('Routes critical alerts to the oncall workflow')).toBeInTheDocument();
      expect(screen.getByText('production')).toBeInTheDocument();
    });

    it('renders a expandable list of tags when there are more than one', () => {
      renderFlyout();

      expect(screen.getByText('production')).toBeInTheDocument();
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('opens the tags popover when the "+N" button is clicked', async () => {
      const user = userEvent.setup();
      renderFlyout();

      await user.click(screen.getByText('+1'));

      expect(screen.getByText('oncall')).toBeInTheDocument();
    });

    it('renders the matcher as the KQL string when provided', () => {
      renderFlyout();

      expect(screen.getByText('data.severity : "critical"')).toBeInTheDocument();
    });

    it('renders a fallback when the matcher is null', () => {
      renderFlyout({ policy: createPolicy({ matcher: null }) });

      expect(screen.getByText(/Matches all alerts/i)).toBeInTheDocument();
    });

    it('renders the dispatch grouping mode and throttle labels', () => {
      renderFlyout();

      expect(screen.getByText('Group')).toBeInTheDocument();
      expect(screen.getByText('At most once every...')).toBeInTheDocument();
      expect(screen.getByText('host.name')).toBeInTheDocument();
      expect(screen.getByText('service.name')).toBeInTheDocument();
    });

    it('does not render the group-by row when grouping mode is per_episode', () => {
      renderFlyout({
        policy: createPolicy({
          grouping_mode: 'per_episode',
          group_by: null,
          throttle: { strategy: 'on_status_change', interval: null },
        }),
      });

      expect(screen.queryByText('host.name')).not.toBeInTheDocument();
    });

    it('renders each destination with its workflow name', () => {
      renderFlyout();

      expect(screen.getByText('Workflow wf-1')).toBeInTheDocument();
      expect(screen.getByText('Workflow wf-2')).toBeInTheDocument();
    });

    it('resolves createdBy / updatedBy UIDs to user full names in the metadata section', async () => {
      renderFlyout();

      const elements = await screen.findAllByText('Elastic User');
      expect(elements).toHaveLength(2);
      elements.forEach((element) => expect(element).toBeInTheDocument());
    });

    it('falls back to the username when a profile has no full name', async () => {
      mockBulkGet.mockResolvedValueOnce([{ uid: ELASTIC_UID, user: { username: 'elastic' } }]);
      renderFlyout();

      const elements = await screen.findAllByText('elastic');
      expect(elements).toHaveLength(2);
      elements.forEach((element) => expect(element).toBeInTheDocument());
    });

    it('falls back to the UID when no matching profile is returned', async () => {
      mockBulkGet.mockResolvedValueOnce([]);
      renderFlyout();

      const elements = await screen.findAllByText(ELASTIC_UID);
      expect(elements).toHaveLength(2);
      elements.forEach((element) => expect(element).toBeInTheDocument());
    });
  });

  describe('footer', () => {
    it('calls onClose when the Close button is clicked', async () => {
      const user = userEvent.setup();
      const { handlers } = renderFlyout();

      await user.click(screen.getByTestId(TEST_SUBJ.closeButton));

      expect(handlers.onClose).toHaveBeenCalledTimes(1);
    });

    it('renders the Take action button for writers', () => {
      renderFlyout();
      expect(screen.getByTestId(TEST_SUBJ.takeActionButton)).toBeInTheDocument();
    });

    it('closes the flyout and calls onEdit when Edit is clicked in the Take action menu', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { handlers } = renderFlyout();

      await user.click(screen.getByTestId(TEST_SUBJ.takeActionButton));
      await user.click(screen.getByTestId('editActionPolicy-policy-1'));

      expect(handlers.onClose).toHaveBeenCalledTimes(1);
      expect(handlers.onEdit).toHaveBeenCalledWith('policy-1');
    });

    it('calls onClone when Clone is clicked in the Take action menu', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { handlers, policy } = renderFlyout();

      await user.click(screen.getByTestId(TEST_SUBJ.takeActionButton));
      await user.click(screen.getByTestId('cloneActionPolicy-policy-1'));

      expect(handlers.onClone).toHaveBeenCalledWith(policy);
    });

    it('calls onDisable when Disable is clicked in the Take action menu on an enabled policy', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { handlers } = renderFlyout();

      await user.click(screen.getByTestId(TEST_SUBJ.takeActionButton));
      await user.click(screen.getByTestId('toggleEnabledActionPolicy-policy-1'));

      expect(handlers.onDisable).toHaveBeenCalledWith('policy-1');
    });

    it('calls onEnable when Enable is clicked in the Take action menu on a disabled policy', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { handlers } = renderFlyout({ policy: createPolicy({ enabled: false }) });

      await user.click(screen.getByTestId(TEST_SUBJ.takeActionButton));
      await user.click(screen.getByTestId('toggleEnabledActionPolicy-policy-1'));

      expect(handlers.onEnable).toHaveBeenCalledWith('policy-1');
    });

    it('calls onUpdateApiKey when Update API key is clicked in the Take action menu', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { handlers } = renderFlyout();

      await user.click(screen.getByTestId(TEST_SUBJ.takeActionButton));
      await user.click(screen.getByTestId('updateApiKeyActionPolicy-policy-1'));

      expect(handlers.onUpdateApiKey).toHaveBeenCalledWith('policy-1');
    });

    it('calls onDelete when Delete is clicked in the Take action menu', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { handlers, policy } = renderFlyout();

      await user.click(screen.getByTestId(TEST_SUBJ.takeActionButton));
      await user.click(screen.getByTestId('deleteActionPolicy-policy-1'));

      expect(handlers.onDelete).toHaveBeenCalledWith(policy);
    });

    it('opens the snooze modal when Snooze is clicked in the Take action menu', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderFlyout();

      await user.click(screen.getByTestId(TEST_SUBJ.takeActionButton));
      await user.click(screen.getByTestId('snoozeActionPolicy-policy-1'));

      expect(screen.getByTestId('actionPolicySnoozeModal')).toBeInTheDocument();
    });

    it('calls onSnooze when the snooze modal is applied', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { handlers } = renderFlyout();

      await user.click(screen.getByTestId(TEST_SUBJ.takeActionButton));
      await user.click(screen.getByTestId('snoozeActionPolicy-policy-1'));
      await user.click(screen.getByTestId('actionPolicySnoozeModalApply'));

      expect(handlers.onSnooze).toHaveBeenCalledTimes(1);
      expect(handlers.onSnooze.mock.calls[0][0]).toBe('policy-1');
    });

    it('calls onCancelSnooze when Unsnooze is clicked in the Take action menu', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { handlers } = renderFlyout({ policy: createPolicy({ snoozed_until: futureIso() }) });

      await user.click(screen.getByTestId(TEST_SUBJ.takeActionButton));
      await user.click(screen.getByTestId('unsnoozeActionPolicy-policy-1'));

      expect(handlers.onCancelSnooze).toHaveBeenCalledWith('policy-1');
    });
  });

  describe('when the user only has read privilege', () => {
    it('hides the Take action button but keeps Close', () => {
      renderFlyout({ canWrite: false });

      expect(screen.queryByTestId(TEST_SUBJ.takeActionButton)).not.toBeInTheDocument();
      expect(screen.getByTestId(TEST_SUBJ.closeButton)).toBeInTheDocument();
    });

    it('still renders the policy details', () => {
      renderFlyout({ canWrite: false });

      expect(screen.getByTestId(TEST_SUBJ.title)).toHaveTextContent('Critical alerts policy');
      expect(screen.getByText('data.severity : "critical"')).toBeInTheDocument();
    });
  });
});
