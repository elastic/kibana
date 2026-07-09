/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
} from '@kbn/rule-data-utils';
import type { Alert } from '@kbn/alerting-types';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import type { AdditionalContext, AlertActionsProps, RenderContext } from '../types';
import { createPartialObjectMock, testQueryClientConfig } from '../utils/test';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';
import { SnoozeAlertAction } from './snooze_alert_action';
import { ExpandableContextMenuPanel } from './expandable_context_menu_panel';

jest.mock('../hooks/use_alert_muted_state');
jest.mock('../hooks/use_alert_snoozed_state');

// The mute-vs-snooze decision + toasts live in useAlertSnooze (covered by its own
// unit tests), so here we mock it and assert SnoozeAlertAction wires the payloads.
const mockSnoozeAlert = jest.fn().mockResolvedValue(true);
const mockUnsnoozeAlert = jest.fn().mockResolvedValue(true);

jest.mock('@kbn/response-ops-alert-snooze', () => ({
  useAlertSnooze: () => ({ snoozeAlert: mockSnoozeAlert, unsnoozeAlert: mockUnsnoozeAlert }),
  AlertSnoozePopover: ({ onApply }: { onApply: (payload: unknown) => void }) => (
    <button data-test-subj="alertSnoozePopover" onClick={() => onApply({ expiresAt: null })}>
      Snooze
    </button>
  ),
  AlertSnoozePanelInline: ({
    onApply,
    onBack,
  }: {
    onApply: (payload: unknown) => void;
    onBack: () => void;
  }) => (
    <div data-test-subj="alertSnoozePanelInline">
      <button
        data-test-subj="alertSnoozePanelInlineApply"
        onClick={() => onApply({ expiresAt: null })}
      >
        Apply
      </button>
      <button data-test-subj="alertSnoozePanelInlineBack" onClick={onBack}>
        Back
      </button>
    </div>
  ),
}));

import { useAlertMutedState } from '../hooks/use_alert_muted_state';
import { useAlertSnoozedState } from '../hooks/use_alert_snoozed_state';

const mockUseAlertMutedState = useAlertMutedState as jest.MockedFunction<typeof useAlertMutedState>;
const mockUseAlertSnoozedState = useAlertSnoozedState as jest.MockedFunction<
  typeof useAlertSnoozedState
>;

const RULE_ID = 'rule-1';
const INSTANCE_ID = 'instance-1';

const activeAlert: Alert = {
  [ALERT_RULE_UUID]: [RULE_ID],
  [ALERT_INSTANCE_ID]: [INSTANCE_ID],
  [ALERT_STATUS]: [ALERT_STATUS_ACTIVE],
} as unknown as Alert;

const inactiveAlert: Alert = {
  [ALERT_RULE_UUID]: [RULE_ID],
  [ALERT_INSTANCE_ID]: [INSTANCE_ID],
  [ALERT_STATUS]: ['recovered'],
} as unknown as Alert;

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

const context = createPartialObjectMock<RenderContext<AdditionalContext>>({
  services: { http, notifications },
});

const queryClient = new QueryClient(testQueryClientConfig);

const TestComponent = (props: AlertActionsProps) => (
  <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
    <AlertsTableContextProvider value={context}>
      <SnoozeAlertAction<AdditionalContext> {...props} />
    </AlertsTableContextProvider>
  </QueryClientProvider>
);

// Renders the action inside ExpandableContextMenuPanel, which provides the
// ExpandableContextMenuPanelProvider context. In this mode SnoozeAlertAction
// renders an inline menu item that swaps the panel content for AlertSnoozePanelInline.
const InlineTestComponent = (props: AlertActionsProps) => (
  <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
    <AlertsTableContextProvider value={context}>
      <ExpandableContextMenuPanel
        items={[<SnoozeAlertAction<AdditionalContext> key="snooze" {...props} />]}
      />
    </AlertsTableContextProvider>
  </QueryClientProvider>
);

const baseProps = createPartialObjectMock<AlertActionsProps>({
  alert: activeAlert,
  refresh: jest.fn(),
});

describe('SnoozeAlertAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSnoozeAlert.mockResolvedValue(true);
    mockUnsnoozeAlert.mockResolvedValue(true);
  });

  describe('visibility', () => {
    it('renders null for an inactive, non-muted, non-snoozed alert', () => {
      mockUseAlertMutedState.mockReturnValue({
        isMuted: false,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
        rule: [],
      });
      mockUseAlertSnoozedState.mockReturnValue({
        isSnoozed: false,
        snoozedInstance: undefined,
        expiresAt: undefined,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
      });

      const { container } = render(<TestComponent {...baseProps} alert={inactiveAlert} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('renders null when ruleId is missing', () => {
      mockUseAlertMutedState.mockReturnValue({
        isMuted: false,
        ruleId: undefined,
        alertInstanceId: INSTANCE_ID,
        rule: [],
      });
      mockUseAlertSnoozedState.mockReturnValue({
        isSnoozed: false,
        snoozedInstance: undefined,
        expiresAt: undefined,
        ruleId: undefined,
        alertInstanceId: INSTANCE_ID,
      });

      const { container } = render(<TestComponent {...baseProps} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('shows the Snooze popover trigger for an active, non-muted, non-snoozed alert', () => {
      mockUseAlertMutedState.mockReturnValue({
        isMuted: false,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
        rule: [],
      });
      mockUseAlertSnoozedState.mockReturnValue({
        isSnoozed: false,
        snoozedInstance: undefined,
        expiresAt: undefined,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
      });

      render(<TestComponent {...baseProps} />);

      expect(screen.getByTestId('alertSnoozePopover')).toBeInTheDocument();
    });

    it('shows the Unsnooze button when alert is muted', () => {
      mockUseAlertMutedState.mockReturnValue({
        isMuted: true,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
        rule: [INSTANCE_ID],
      });
      mockUseAlertSnoozedState.mockReturnValue({
        isSnoozed: false,
        snoozedInstance: undefined,
        expiresAt: undefined,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
      });

      render(<TestComponent {...baseProps} />);

      expect(screen.getByTestId('snooze-alert-action-unsnooze')).toBeInTheDocument();
    });

    it('shows the Unsnooze button when alert is snoozed', () => {
      mockUseAlertMutedState.mockReturnValue({
        isMuted: false,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
        rule: [],
      });
      mockUseAlertSnoozedState.mockReturnValue({
        isSnoozed: true,
        snoozedInstance: {
          instanceId: INSTANCE_ID,
          snoozedAt: '2026-05-15T00:00:00.000Z',
          snoozedBy: 'user1',
        },
        expiresAt: undefined,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
      });

      render(<TestComponent {...baseProps} />);

      expect(screen.getByTestId('snooze-alert-action-unsnooze')).toBeInTheDocument();
    });
  });

  describe('unsnooze actions', () => {
    it('calls unsnoozeAlert when Unsnooze is clicked on a muted alert', async () => {
      mockUseAlertMutedState.mockReturnValue({
        isMuted: true,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
        rule: [INSTANCE_ID],
      });
      mockUseAlertSnoozedState.mockReturnValue({
        isSnoozed: false,
        snoozedInstance: undefined,
        expiresAt: undefined,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
      });

      render(<TestComponent {...baseProps} />);
      fireEvent.click(screen.getByTestId('snooze-alert-action-unsnooze'));

      await waitFor(() => {
        expect(mockUnsnoozeAlert).toHaveBeenCalledTimes(1);
      });
    });

    it('calls unsnoozeAlert when Unsnooze is clicked on a snoozed (not muted) alert', async () => {
      mockUseAlertMutedState.mockReturnValue({
        isMuted: false,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
        rule: [],
      });
      mockUseAlertSnoozedState.mockReturnValue({
        isSnoozed: true,
        snoozedInstance: {
          instanceId: INSTANCE_ID,
          snoozedAt: '2026-05-15T00:00:00.000Z',
          snoozedBy: 'user1',
        },
        expiresAt: undefined,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
      });

      render(<TestComponent {...baseProps} />);
      fireEvent.click(screen.getByTestId('snooze-alert-action-unsnooze'));

      await waitFor(() => {
        expect(mockUnsnoozeAlert).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('snooze actions', () => {
    beforeEach(() => {
      mockUseAlertMutedState.mockReturnValue({
        isMuted: false,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
        rule: [],
      });
      mockUseAlertSnoozedState.mockReturnValue({
        isSnoozed: false,
        snoozedInstance: undefined,
        expiresAt: undefined,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
      });
    });

    it('applies the snooze payload from the popover (indefinite, no conditions)', async () => {
      // The mock AlertSnoozePopover calls onApply({ expiresAt: null }) when clicked
      render(<TestComponent {...baseProps} />);
      fireEvent.click(screen.getByTestId('alertSnoozePopover'));

      await waitFor(() => {
        expect(mockSnoozeAlert).toHaveBeenCalledWith({ expiresAt: null });
      });
    });

    it('applies the snooze payload from the popover with an expiresAt date', async () => {
      // Override mock to call onApply with a time-based payload
      (jest.requireMock('@kbn/response-ops-alert-snooze') as any).AlertSnoozePopover = ({
        onApply,
      }: {
        onApply: (payload: unknown) => void;
      }) => (
        <button
          data-test-subj="alertSnoozePopover"
          onClick={() => onApply({ expiresAt: '2026-06-01T00:00:00.000Z' })}
        >
          Snooze
        </button>
      );

      render(<TestComponent {...baseProps} />);
      fireEvent.click(screen.getByTestId('alertSnoozePopover'));

      await waitFor(() => {
        expect(mockSnoozeAlert).toHaveBeenCalledWith({ expiresAt: '2026-06-01T00:00:00.000Z' });
      });
    });
  });

  describe('within snooze panel context (inline)', () => {
    beforeEach(() => {
      mockUseAlertMutedState.mockReturnValue({
        isMuted: false,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
        rule: [],
      });
      mockUseAlertSnoozedState.mockReturnValue({
        isSnoozed: false,
        snoozedInstance: undefined,
        expiresAt: undefined,
        ruleId: RULE_ID,
        alertInstanceId: INSTANCE_ID,
      });
    });

    it('shows the inline Snooze menu item instead of the popover when the context is available', () => {
      render(<InlineTestComponent {...baseProps} />);

      expect(screen.getByTestId('snooze-alert-action-snooze')).toBeInTheDocument();
      expect(screen.queryByTestId('alertSnoozePopover')).not.toBeInTheDocument();
    });

    it('swaps the menu for the inline snooze panel when the Snooze item is clicked', () => {
      render(<InlineTestComponent {...baseProps} />);
      fireEvent.click(screen.getByTestId('snooze-alert-action-snooze'));

      expect(screen.getByTestId('alertSnoozePanelInline')).toBeInTheDocument();
      expect(screen.queryByTestId('snooze-alert-action-snooze')).not.toBeInTheDocument();
    });

    it('applies the snooze and restores the menu when applying from the inline panel', async () => {
      render(<InlineTestComponent {...baseProps} />);
      fireEvent.click(screen.getByTestId('snooze-alert-action-snooze'));
      fireEvent.click(screen.getByTestId('alertSnoozePanelInlineApply'));

      await waitFor(() => {
        expect(mockSnoozeAlert).toHaveBeenCalledWith({ expiresAt: null });
      });

      await waitFor(() => {
        expect(screen.getByTestId('snooze-alert-action-snooze')).toBeInTheDocument();
        expect(screen.queryByTestId('alertSnoozePanelInline')).not.toBeInTheDocument();
      });
    });

    it('restores the menu without snoozing when Back is clicked in the inline panel', () => {
      render(<InlineTestComponent {...baseProps} />);
      fireEvent.click(screen.getByTestId('snooze-alert-action-snooze'));
      fireEvent.click(screen.getByTestId('alertSnoozePanelInlineBack'));

      expect(screen.getByTestId('snooze-alert-action-snooze')).toBeInTheDocument();
      expect(screen.queryByTestId('alertSnoozePanelInline')).not.toBeInTheDocument();
      expect(mockSnoozeAlert).not.toHaveBeenCalled();
    });
  });
});
