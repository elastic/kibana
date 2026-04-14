/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import {
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
} from '@kbn/rule-data-utils';
import { createPartialObjectMock, testQueryClientConfig } from '../utils/test';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import type { AdditionalContext, AlertActionsProps, RenderContext } from '../types';
import { AcknowledgeAlertAction } from './acknowledge_alert_action';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

const queryClient = new QueryClient(testQueryClientConfig);

const createContext = () =>
  createPartialObjectMock<RenderContext<AdditionalContext>>({
    services: { http, notifications },
  });

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
    <AlertsTableContextProvider value={createContext()}>{children}</AlertsTableContextProvider>
  </QueryClientProvider>
);

describe('AcknowledgeAlertAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Acknowledge" for an active alert with open workflow status', () => {
    const props = createPartialObjectMock<AlertActionsProps>({
      alert: {
        [ALERT_STATUS]: [ALERT_STATUS_ACTIVE] as never,
        [ALERT_WORKFLOW_STATUS]: ['open'] as never,
        [ALERT_UUID]: ['test-uuid'] as never,
        [ALERT_RULE_UUID]: ['rule-uuid'] as never,
      },
      refresh: jest.fn(),
    });

    render(
      <Wrapper>
        <AcknowledgeAlertAction {...props} />
      </Wrapper>
    );

    expect(screen.getByText('Acknowledge')).toBeInTheDocument();
  });

  it('renders "Unacknowledge" for an acknowledged alert', () => {
    const props = createPartialObjectMock<AlertActionsProps>({
      alert: {
        [ALERT_STATUS]: [ALERT_STATUS_ACTIVE] as never,
        [ALERT_WORKFLOW_STATUS]: ['acknowledged'] as never,
        [ALERT_UUID]: ['test-uuid'] as never,
        [ALERT_RULE_UUID]: ['rule-uuid'] as never,
      },
      refresh: jest.fn(),
    });

    render(
      <Wrapper>
        <AcknowledgeAlertAction {...props} />
      </Wrapper>
    );

    expect(screen.getByText('Unacknowledge')).toBeInTheDocument();
  });

  it('renders nothing when workflow status is neither open nor acknowledged', () => {
    const props = createPartialObjectMock<AlertActionsProps>({
      alert: {
        [ALERT_STATUS]: [ALERT_STATUS_ACTIVE] as never,
        [ALERT_WORKFLOW_STATUS]: ['closed'] as never,
        [ALERT_UUID]: ['test-uuid'] as never,
        [ALERT_RULE_UUID]: ['rule-uuid'] as never,
      },
      refresh: jest.fn(),
    });

    render(
      <Wrapper>
        <AcknowledgeAlertAction {...props} />
      </Wrapper>
    );

    expect(screen.queryByText('Acknowledge')).not.toBeInTheDocument();
    expect(screen.queryByText('Unacknowledge')).not.toBeInTheDocument();
  });

  it('calls the bulk_update API when Acknowledge is clicked', async () => {
    http.post.mockResolvedValueOnce({});
    const refresh = jest.fn();
    const props = createPartialObjectMock<AlertActionsProps>({
      alert: {
        [ALERT_STATUS]: [ALERT_STATUS_ACTIVE] as never,
        [ALERT_WORKFLOW_STATUS]: ['open'] as never,
        [ALERT_UUID]: ['test-uuid'] as never,
        [ALERT_RULE_UUID]: ['rule-uuid'] as never,
      },
      refresh,
    });

    render(
      <Wrapper>
        <AcknowledgeAlertAction {...props} />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Acknowledge'));

    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith(
        '/internal/rac/alerts/bulk_update',
        expect.objectContaining({
          body: expect.stringContaining('"status":"acknowledged"'),
        })
      );
    });
  });
});
