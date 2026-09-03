/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import type { AdditionalContext, AlertActionsProps, RenderContext } from '../types';
import { createPartialObjectMock } from '../utils/test';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';
import { InvestigateAlertAction } from './investigate_alert_action';
import { useInvestigateAlert } from '../hooks/use_investigate_alert';

jest.mock('../hooks/use_investigate_alert', () => ({
  useInvestigateAlert: jest.fn(),
}));

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const application = applicationServiceMock.createStartContract();
const useInvestigateAlertMock = useInvestigateAlert as jest.Mock;
const alert = {
  _id: 'document-id',
  _index: '.alerts-observability.test.alerts-default',
  'kibana.alert.rule.name': ['Test rule'],
  'kibana.alert.rule.category': ['Test category'],
  'kibana.alert.reason': ['Threshold exceeded'],
  'kibana.alert.status': ['active'],
  'kibana.alert.start': ['2026-09-01T10:00:00.000Z'],
};

const renderAction = (
  overrides: Partial<AlertActionsProps> = {},
  capabilities = { nightshiftInvestigations: { available: true }, agentBuilder: { write: true } }
) => {
  application.capabilities = { ...application.capabilities, ...capabilities };
  const context = createPartialObjectMock<RenderContext<AdditionalContext>>({
    services: { application, http, notifications },
  });
  const props = createPartialObjectMock<AlertActionsProps>({
    alert,
    investigationContext: { ruleId: 'rule-id', ruleTypeId: 'test.rule' },
    ...overrides,
  });
  return render(
    <AlertsTableContextProvider value={context}>
      <InvestigateAlertAction {...props} />
    </AlertsTableContextProvider>
  );
};

describe('InvestigateAlertAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useInvestigateAlertMock.mockImplementation(({ startInvestigation }) => ({
      showInvestigateAction: true,
      handleInvestigate: startInvestigation,
      isInvestigating: false,
      investigateActionLabel: 'Investigate',
    }));
  });

  it('uses row and rule context fields to start an investigation', async () => {
    renderAction();
    fireEvent.click(screen.getByTestId('investigateAlert'));

    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith('/internal/nightshift/investigations', {
        body: JSON.stringify({
          subject: { type: 'alert', id: 'document-id' },
          concurrency_key: 'document-id',
          context: {
            alerts: [
              {
                id: 'document-id',
                rule_id: 'rule-id',
                rule_name: 'Test rule',
                rule_type_id: 'test.rule',
                rule_category: 'Test category',
                reason: 'Threshold exceeded',
                status: 'active',
                start: '2026-09-01T10:00:00.000Z',
              },
            ],
          },
        }),
      });
    });
  });

  it('reports request failures', async () => {
    useInvestigateAlertMock.mockReturnValue({
      showInvestigateAction: true,
      handleInvestigate: () =>
        notifications.toasts.addDanger({
          title: 'Failed to start investigation',
          text: 'Request failed',
        }),
      isInvestigating: false,
      investigateActionLabel: 'Investigate',
    });
    renderAction();
    fireEvent.click(screen.getByTestId('investigateAlert'));

    await waitFor(() => {
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Failed to start investigation',
        text: 'Request failed',
      });
    });
  });

  it('hides the action when investigations are unavailable', () => {
    useInvestigateAlertMock.mockReturnValue({ showInvestigateAction: false });
    renderAction(
      {},
      { nightshiftInvestigations: { available: false }, agentBuilder: { write: true } }
    );
    expect(screen.queryByTestId('investigateAlert')).not.toBeInTheDocument();
  });

  it('hides the action without Agent Builder write access', () => {
    useInvestigateAlertMock.mockReturnValue({ showInvestigateAction: false });
    renderAction(
      {},
      { nightshiftInvestigations: { available: true }, agentBuilder: { write: false } }
    );
    expect(screen.queryByTestId('investigateAlert')).not.toBeInTheDocument();
  });

  it('hides the action for Security rules', () => {
    useInvestigateAlertMock.mockReturnValue({ showInvestigateAction: false });
    renderAction({ investigationContext: { ruleId: 'rule-id', ruleTypeId: 'siem.queryRule' } });
    expect(screen.queryByTestId('investigateAlert')).not.toBeInTheDocument();
  });
});
