/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';
import { MaintenanceWindowsEditPage } from './edit_page';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ maintenanceWindowId: 'mw-1' }),
}));
jest.mock('../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));
jest.mock('../hooks/use_get_maintenance_window');
jest.mock('./create_maintenance_windows_form', () => ({
  CreateMaintenanceWindowForm: () => <div data-test-subj="createMaintenanceWindowForm" />,
}));

const { useGetMaintenanceWindow: useGetMaintenanceWindowMock } = jest.requireMock(
  '../hooks/use_get_maintenance_window'
);

describe('MaintenanceWindowsEditPage', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    (appMockRenderer.coreStart.application.getUrlForApp as jest.Mock).mockReturnValue(
      '/app/management/insightsAndAlerting/maintenanceWindows'
    );
  });

  it('keeps the header and shows a loading body while the window loads', () => {
    useGetMaintenanceWindowMock.mockReturnValue({
      maintenanceWindow: undefined,
      showMultipleSolutionsWarning: false,
      isLoading: true,
      isError: false,
    });

    const { getByTestId, queryByTestId } = appMockRenderer.render(<MaintenanceWindowsEditPage />);

    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Edit maintenance window'
    );
    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toBeInTheDocument();
    expect(getByTestId('sectionLoading')).toBeInTheDocument();
    expect(queryByTestId('createMaintenanceWindowForm')).not.toBeInTheDocument();
  });

  it('renders the AppHeader title, back link, and form after load', async () => {
    useGetMaintenanceWindowMock.mockReturnValue({
      maintenanceWindow: { title: 'Window' },
      showMultipleSolutionsWarning: false,
      isLoading: false,
      isError: false,
    });

    const { getByTestId, findByTestId, queryByTestId } = appMockRenderer.render(
      <MaintenanceWindowsEditPage />
    );

    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Edit maintenance window'
    );
    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/management/insightsAndAlerting/maintenanceWindows'
    );
    expect(getByTestId('createMaintenanceWindowForm')).toBeInTheDocument();
    expect(queryByTestId('sectionLoading')).not.toBeInTheDocument();

    await openAppMenuOverflow();
    const docLink = await findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation);
    expect(docLink).toHaveAttribute(
      'href',
      appMockRenderer.coreStart.docLinks.links.alerting.maintenanceWindows
    );
    expect(docLink).toHaveAttribute('target', '_blank');
  });
});
