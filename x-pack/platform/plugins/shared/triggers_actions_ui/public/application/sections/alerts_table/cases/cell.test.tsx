/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { CasesCell } from './cell';
import { CellComponentProps } from '../types';
import { Alert } from '../../../../types';
import { getCasesMockMap } from './index.mock';
import { getMaintenanceWindowMockMap } from '../maintenance_windows/index.mock';
import userEvent from '@testing-library/user-event';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';
import { useCaseViewNavigation } from './use_case_view_navigation';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';

const mockUseKibanaReturnValue = createStartServicesMock();
jest.mock('../../../../common/lib/kibana', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));
jest.mock('./use_case_view_navigation');

const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

describe('CasesCell', () => {
  const casesMap = getCasesMockMap();
  const maintenanceWindowsMap = getMaintenanceWindowMockMap();
  const alert = {
    _id: 'alert-id',
    _index: 'alert-index',
    'kibana.alert.case_ids': ['test-id'],
  } as Alert;

  const props: CellComponentProps = {
    isLoading: false,
    alert,
    cases: casesMap,
    maintenanceWindows: maintenanceWindowsMap,
    columnId: 'kibana.alert.case_ids',
    showAlertStatusWithFlapping: false,
  };

  let appMockRender: AppMockRenderer;

  const navigateToCaseView = jest.fn();
  useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView });

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders the cases cell', async () => {
    appMockRender.render(<CasesCell {...props} />);
    expect(screen.getByText('Test case')).toBeInTheDocument();
  });

  it('renders the loading skeleton', async () => {
    appMockRender.render(<CasesCell {...props} isLoading={true} />);
    expect(screen.getByTestId('cases-cell-loading')).toBeInTheDocument();
  });

  it('renders multiple cases correctly', async () => {
    appMockRender.render(
      <CasesCell
        {...props}
        alert={{ ...alert, 'kibana.alert.case_ids': ['test-id', 'test-id-2'] } as Alert}
      />
    );

    expect(screen.getByText('Test case')).toBeInTheDocument();
    expect(screen.getByText('Test case 2')).toBeInTheDocument();
  });

  it('does not render a case that it is in the map but not in the alerts data', async () => {
    appMockRender.render(<CasesCell {...props} />);

    expect(screen.getByText('Test case')).toBeInTheDocument();
    expect(screen.queryByText('Test case 2')).not.toBeInTheDocument();
  });

  it('does not show any cases when the alert does not have any case ids', async () => {
    appMockRender.render(
      <CasesCell {...props} alert={{ ...alert, 'kibana.alert.case_ids': [] } as unknown as Alert} />
    );

    expect(screen.queryByText('Test case')).not.toBeInTheDocument();
    expect(screen.queryByText('Test case 2')).not.toBeInTheDocument();
  });

  it('does show the default value when the alert does not have any case ids', async () => {
    appMockRender.render(
      <CasesCell {...props} alert={{ ...alert, 'kibana.alert.case_ids': [] } as unknown as Alert} />
    );

    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('does not show any cases when the alert has invalid case ids', async () => {
    appMockRender.render(
      <CasesCell {...props} alert={{ ...alert, 'kibana.alert.case_ids': ['not-exist'] } as Alert} />
    );

    expect(screen.queryByTestId('cases-cell-link')).not.toBeInTheDocument();
  });

  it('does show the default value when the alert has invalid case ids', async () => {
    appMockRender.render(
      <CasesCell {...props} alert={{ ...alert, 'kibana.alert.case_ids': ['not-exist'] } as Alert} />
    );

    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('shows the cases tooltip', async () => {
    appMockRender.render(<CasesCell {...props} />);
    expect(screen.getByText('Test case')).toBeInTheDocument();

    await userEvent.hover(screen.getByText('Test case'));

    expect(await screen.findByTestId('cases-components-tooltip')).toBeInTheDocument();
  });

  it('navigates to the case correctly', async () => {
    appMockRender.render(<CasesCell {...props} />);
    expect(screen.getByText('Test case')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Test case'));
    expect(navigateToCaseView).toBeCalledWith({ caseId: 'test-id' });
  });
});
