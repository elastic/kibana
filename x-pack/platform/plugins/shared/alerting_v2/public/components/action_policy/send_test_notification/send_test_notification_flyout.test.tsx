/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  ActionPolicyResponse,
  ActionPolicyTestPreviewResponse,
  ActionPolicyTestSendResponse,
} from '@kbn/alerting-v2-schemas';
import { ExecutionStatus } from '@kbn/workflows';
import { createTestQueryClient, TestProviders } from '../../../test_utils/test_providers';
import { SendTestNotificationFlyout } from './send_test_notification_flyout';
import type { SendTestResultsFlyout } from './send_test_results_flyout';

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return {
        getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
      };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

let mockPreview: ActionPolicyTestPreviewResponse | undefined;
const mockReload = jest.fn();
jest.mock('../../../hooks/use_preview_test_notification', () => ({
  usePreviewTestNotification: () => ({
    data: mockPreview,
    isLoading: false,
    error: null,
    reload: mockReload,
  }),
}));

let mockSendResponse: ActionPolicyTestSendResponse | undefined;
const mockSend = jest.fn();
const mockResetSend = jest.fn();
jest.mock('../../../hooks/use_send_test_notification', () => ({
  useSendTestNotification: () => ({
    mutate: mockSend,
    data: mockSendResponse,
    isLoading: false,
    reset: mockResetSend,
  }),
}));

const mockResultsFlyoutProps = jest.fn<void, [ComponentProps<typeof SendTestResultsFlyout>]>();
jest.mock('./send_test_results_flyout', () => {
  const { SendTestResultsFlyout: ActualSendTestResultsFlyout } = jest.requireActual(
    './send_test_results_flyout'
  );
  return {
    SendTestResultsFlyout: (props: ComponentProps<typeof SendTestResultsFlyout>) => {
      mockResultsFlyoutProps(props);
      return <ActualSendTestResultsFlyout {...props} />;
    },
  };
});

const closeResultsFlyout = (reason: 'navigation-back' | 'close-button' | 'navigation-cascade') => {
  const { onClose } =
    mockResultsFlyoutProps.mock.calls[mockResultsFlyoutProps.mock.calls.length - 1][0];
  act(() => {
    onClose(new MouseEvent('click'), { reason });
  });
};

jest.mock('../../../hooks/use_fetch_workflow', () => ({
  useFetchWorkflow: (id: string) => ({ data: { id, name: `Workflow ${id}` } }),
}));

jest.mock('../../../hooks/use_workflow_execution_status', () => ({
  useWorkflowExecutionStatus: () => ({
    data: { status: ExecutionStatus.COMPLETED },
    isError: false,
  }),
}));

const ELASTIC_ACTOR = { profile_uid: 'elastic_uid' };

const policy: ActionPolicyResponse = {
  id: 'policy-1',
  name: 'Critical alerts policy',
  description: 'Routes critical alerts to the oncall workflow',
  enabled: true,
  destinations: [
    { type: 'workflow', id: 'wf-1' },
    { type: 'workflow', id: 'wf-2' },
    { type: 'workflow', id: 'wf-3' },
  ],
  grouping: { mode: 'per_field', fields: ['host.name'] },
  throttle: { strategy: 'time_interval', interval: '5m' },
  created_by: ELASTIC_ACTOR,
  created_at: '2026-03-01T10:00:00.000Z',
  updated_by: ELASTIC_ACTOR,
  updated_at: '2026-03-02T11:00:00.000Z',
};

const createPreview = (): ActionPolicyTestPreviewResponse => ({
  seed: 42,
  groups: [{ id: 'group-1' }],
  destinations: [
    { id: 'wf-1', name: 'Pager', enabled: true, executable: true },
    { id: 'wf-2', name: 'Slack', enabled: true, executable: true },
    { id: 'wf-3', name: 'Email', enabled: true, executable: true },
  ],
});

const renderFlyout = (onClose = jest.fn()) => {
  const queryClient = createTestQueryClient();
  const createFlyout = () => (
    <TestProviders queryClient={queryClient}>
      <SendTestNotificationFlyout policy={policy} onClose={onClose} />
    </TestProviders>
  );
  const view = render(createFlyout());
  const rerender = () => view.rerender(createFlyout());

  return { onClose, rerender };
};

const getCheckbox = (id: string) => screen.getByTestId(`sendTestNotificationDestination-${id}`);

describe('SendTestNotificationFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreview = createPreview();
    mockSendResponse = undefined;
  });

  describe('before sending', () => {
    it('renders the destinations form without results', () => {
      renderFlyout();

      expect(screen.getByTestId('sendTestNotificationSendButton')).toBeEnabled();
      expect(getCheckbox('wf-1')).toBeInTheDocument();
      expect(getCheckbox('wf-2')).toBeInTheDocument();
      expect(getCheckbox('wf-3')).toBeInTheDocument();
      expect(screen.queryByTestId('sendTestNotificationResultsFlyout')).not.toBeInTheDocument();
    });

    it('sends the previewed seed to the selected destinations', async () => {
      renderFlyout();

      await userEvent.click(getCheckbox('wf-3'));
      await userEvent.click(screen.getByTestId('sendTestNotificationSendButton'));

      expect(mockSend).toHaveBeenCalledWith({ seed: 42, destinationIds: ['wf-1', 'wf-2'] });
    });
  });

  describe('after sending', () => {
    beforeEach(() => {
      mockSendResponse = {
        results: [
          { workflow_id: 'wf-1', workflow_execution_id: 'exec-1' },
          { workflow_id: 'wf-2', error: 'boom' },
        ],
      };
    });

    it('opens the test runs of the workflows sent to on top of the form', () => {
      renderFlyout();

      const resultsFlyout = within(screen.getByTestId('sendTestNotificationResultsFlyout'));
      expect(resultsFlyout.getByText('Test runs')).toBeInTheDocument();
      expect(resultsFlyout.queryByTestId('sendTestNotificationSendButton')).not.toBeInTheDocument();
      expect(screen.getByTestId('sendTestNotificationResult-wf-1')).toHaveTextContent('Pager');
      expect(screen.getByTestId('sendTestNotificationResult-wf-2')).toHaveTextContent('Slack');
      expect(screen.queryByTestId('sendTestNotificationResult-wf-3')).not.toBeInTheDocument();
    });

    it('shows the status and execution link of a started test run', () => {
      renderFlyout();

      const row = within(screen.getByTestId('sendTestNotificationResult-wf-1'));
      expect(row.getByTestId('sendTestNotificationStatus-completed')).toBeInTheDocument();
      const link = row.getByTestId('sendTestNotificationExecutionLink');
      expect(link).toHaveTextContent('View workflow execution');
      expect(link).toHaveAttribute('href', '/app/workflows/wf-1?tab=executions&executionId=exec-1');
    });

    it('shows why a test run could not be started', () => {
      renderFlyout();

      const row = within(screen.getByTestId('sendTestNotificationResult-wf-2'));
      expect(row.getByTestId('sendTestNotificationStatus-failed')).toBeInTheDocument();
      expect(row.getByTestId('sendTestNotificationError')).toHaveTextContent('boom');
    });

    it('shows the results when no test run could be started', () => {
      mockSendResponse = { results: [{ workflow_id: 'wf-1', error: 'boom' }] };
      renderFlyout();

      expect(screen.getByTestId('sendTestNotificationResultsFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('sendTestNotificationResult-wf-1')).toBeInTheDocument();
    });

    it('links the test runs flyout to the form flyout history', () => {
      renderFlyout();

      expect(mockResultsFlyoutProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ historyKey: expect.any(Symbol) })
      );
    });

    it('shows a test run whose workflow is not in the previewed destinations', () => {
      mockSendResponse = {
        results: [{ workflow_id: 'wf-unknown', workflow_execution_id: 'exec-9' }],
      };
      renderFlyout();

      expect(screen.getByTestId('sendTestNotificationResult-wf-unknown')).toBeInTheDocument();
    });

    it('builds a new preview when the test runs flyout is closed', () => {
      renderFlyout();

      closeResultsFlyout('close-button');

      expect(mockResetSend).toHaveBeenCalledTimes(1);
      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('does not build a new preview when the form flyout closes the test runs flyout', () => {
      renderFlyout();

      closeResultsFlyout('navigation-cascade');

      expect(mockResetSend).toHaveBeenCalledTimes(1);
      expect(mockReload).not.toHaveBeenCalled();
    });

    it('goes back to the form with a new preview and every destination selected', async () => {
      mockSendResponse = undefined;
      const { rerender } = renderFlyout();
      await userEvent.click(getCheckbox('wf-3'));
      mockSendResponse = { results: [{ workflow_id: 'wf-1', workflow_execution_id: 'exec-1' }] };
      rerender();

      closeResultsFlyout('navigation-back');

      expect(mockResetSend).toHaveBeenCalledTimes(1);
      expect(mockReload).toHaveBeenCalledTimes(1);
      mockSendResponse = undefined;
      rerender();
      expect(screen.queryByTestId('sendTestNotificationResultsFlyout')).not.toBeInTheDocument();
      expect(getCheckbox('wf-1')).toBeChecked();
      expect(getCheckbox('wf-2')).toBeChecked();
      expect(getCheckbox('wf-3')).toBeChecked();
    });
  });
});
