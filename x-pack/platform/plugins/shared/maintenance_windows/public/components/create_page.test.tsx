/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';
import { MaintenanceWindowsCreate } from './create_page';

vi.mock('../hooks/use_breadcrumbs', () => {
      const mocked = {
      useBreadcrumbs: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./create_maintenance_windows_form', () => {
      const mocked = {
      CreateMaintenanceWindowForm: () => <div data-test-subj="createMaintenanceWindowForm" />,
    };
      return { ...mocked, default: mocked };
    });

describe('MaintenanceWindowsCreate', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    vi.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    (appMockRenderer.coreStart.application.getUrlForApp as Mock).mockReturnValue(
      '/app/management/insightsAndAlerting/maintenanceWindows'
    );
  });

  it('renders the AppHeader title, description, and back link', async () => {
    const { getByTestId, findByTestId } = appMockRenderer.render(<MaintenanceWindowsCreate />);

    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Create maintenance window'
    );
    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Schedule a single or recurring period in which new alerts do not send notifications.'
    );
    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/management/insightsAndAlerting/maintenanceWindows'
    );
    expect(getByTestId('createMaintenanceWindowForm')).toBeInTheDocument();

    await openAppMenuOverflow();
    const docLink = await findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation);
    expect(docLink).toHaveAttribute(
      'href',
      appMockRenderer.coreStart.docLinks.links.alerting.maintenanceWindows
    );
    expect(docLink).toHaveAttribute('target', '_blank');
  });
});
