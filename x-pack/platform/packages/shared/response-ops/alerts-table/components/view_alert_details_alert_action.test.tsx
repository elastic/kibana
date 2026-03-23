/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import type { Alert } from '@kbn/alerting-types';
import type { AdditionalContext, AlertActionsProps, RenderContext } from '../types';
import { createPartialObjectMock } from '../utils/test';
import { ViewAlertDetailsAlertAction } from './view_alert_details_alert_action';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';

const mockAlertId = 'dc80788f-f869-4f14-bedb-950186c9d2f8';

const mockAlert = {
  _id: mockAlertId,
  _index: '.internal.alerts-stack.alerts-default-000001',
  'kibana.alert.uuid': [mockAlertId],
  'kibana.alert.status': ['active'],
} as unknown as Alert;

const mockAlertNoUuid = {
  _id: mockAlertId,
  _index: '.internal.alerts-stack.alerts-default-000001',
  'kibana.alert.status': ['active'],
} as unknown as Alert;

const mockOnExpandedAlertIndexChange = jest.fn();
const mockOnActionExecuted = jest.fn();

const application = applicationServiceMock.createStartContract();

const context = createPartialObjectMock<RenderContext<AdditionalContext>>({
  services: {
    http: httpServiceMock.createStartContract(),
    fieldFormats: fieldFormatsMock,
    application,
  },
});

const baseProps = createPartialObjectMock<AlertActionsProps>({
  alert: mockAlert,
  rowIndex: 0,
  onExpandedAlertIndexChange: mockOnExpandedAlertIndexChange,
  onActionExecuted: mockOnActionExecuted,
});

const renderWithContext = (props: Partial<AlertActionsProps> = {}) =>
  render(
    <AlertsTableContextProvider value={context}>
      <ViewAlertDetailsAlertAction<AdditionalContext> {...baseProps} {...props} />
    </AlertsTableContextProvider>
  );

describe('ViewAlertDetailsAlertAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    application.getUrlForApp.mockReturnValue(`/app/observability/alerts/${mockAlertId}`);
  });

  describe('with alertDetailsNavigation', () => {
    const alertDetailsNavigation = {
      appId: 'observability',
      getPath: (alertId: string) => `/alerts/${alertId}`,
    };

    it('should render a link to the alert details page', () => {
      renderWithContext({ alertDetailsNavigation });

      const link = screen.getByTestId('viewAlertDetailsPage');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', `/app/observability/alerts/${mockAlertId}`);
    });

    it('should call getUrlForApp with the correct arguments', () => {
      renderWithContext({ alertDetailsNavigation });

      expect(application.getUrlForApp).toHaveBeenCalledWith('observability', {
        path: `/alerts/${mockAlertId}`,
      });
    });

    it('should open in a new tab when openLinksInNewTab is true', () => {
      renderWithContext({ alertDetailsNavigation, openLinksInNewTab: true });

      expect(screen.getByTestId('viewAlertDetailsPage')).toHaveAttribute('target', '_blank');
    });

    it('should not open in a new tab by default', () => {
      renderWithContext({ alertDetailsNavigation });

      expect(screen.getByTestId('viewAlertDetailsPage')).not.toHaveAttribute('target');
    });

    it('should fall back to flyout when alert has no UUID', () => {
      renderWithContext({ alertDetailsNavigation, alert: mockAlertNoUuid });

      expect(screen.queryByTestId('viewAlertDetailsPage')).not.toBeInTheDocument();
      expect(screen.getByTestId('viewAlertDetailsFlyout')).toBeInTheDocument();
    });
  });

  describe('without alertDetailsNavigation', () => {
    it('should render the flyout action', () => {
      renderWithContext();

      expect(screen.queryByTestId('viewAlertDetailsPage')).not.toBeInTheDocument();
      expect(screen.getByTestId('viewAlertDetailsFlyout')).toBeInTheDocument();
    });

    it('should expand the alert on click', async () => {
      renderWithContext();

      await userEvent.click(screen.getByTestId('viewAlertDetailsFlyout'));
      expect(mockOnExpandedAlertIndexChange).toHaveBeenCalledWith(0);
    });

    it('should call onActionExecuted on click', async () => {
      renderWithContext();

      await userEvent.click(screen.getByTestId('viewAlertDetailsFlyout'));
      expect(mockOnActionExecuted).toHaveBeenCalled();
    });
  });
});
