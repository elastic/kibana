/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import type { MemoryRouterProps } from 'react-router';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  noCasesSettingsPermission,
  noCreateCasesPermissions,
  readCasesPermissions,
  TestProviders,
} from '../../common/mock';
import { CasesRoutes } from './routes';
import type { CasesPermissions } from '../../../common';
import { useGetCase } from '../../containers/use_get_case';
import { defaultGetCase } from '../case_view/mocks';

jest.mock('../../containers/use_get_case');

jest.mock('../all_cases', () => ({
  AllCases: () => <div>{'All cases'}</div>,
}));

jest.mock('../create', () => ({
  CreateCase: () => <div>{'Create case'}</div>,
}));

jest.mock('../configure_cases', () => ({
  ConfigureCases: () => <div>{'Settings'}</div>,
}));

jest.mock('../case_view/case_view_page', () => ({
  CaseViewPage: () => <div>{'Case View Page'}</div>,
}));

const useGetCaseMock = useGetCase as jest.Mock;

const getCaseViewPaths = () => ['/cases/test-id', '/cases/test-id/comment-id'];

const renderWithRouter = (
  initialEntries: MemoryRouterProps['initialEntries'] = ['/cases'],
  permissions?: CasesPermissions
) => {
  return render(
    <TestProviders permissions={permissions}>
      <MemoryRouter initialEntries={initialEntries}>
        <CasesRoutes useFetchAlertData={(alertIds) => [false, {}]} />
      </MemoryRouter>
    </TestProviders>
  );
};

describe('Cases routes', () => {
  describe('All cases', () => {
    it('navigates to the all cases page', async () => {
      renderWithRouter();
      expect(await screen.findByText('All cases')).toBeInTheDocument();
    });

    // User has read only privileges
    it('user can navigate to the all cases page with only read permissions', async () => {
      renderWithRouter(['/cases'], readCasesPermissions());
      expect(await screen.findByText('All cases')).toBeInTheDocument();
    });
  });

  describe('Case view', () => {
    beforeEach(() => {
      useGetCaseMock.mockReturnValue({
        ...defaultGetCase,
      });
    });

    it.each(getCaseViewPaths())(
      'navigates to the cases view page for path: %s',
      async (path: string) => {
        renderWithRouter([path]);
        expect(await screen.findByText('Case View Page')).toBeInTheDocument();
        // User has read only privileges
      }
    );

    it.each(getCaseViewPaths())(
      'user can navigate to the cases view page with read permissions and path: %s',
      async (path: string) => {
        renderWithRouter([path], readCasesPermissions());
        expect(await screen.findByText('Case View Page')).toBeInTheDocument();
      }
    );
  });

  describe('Create case', () => {
    it('navigates to the create case page', async () => {
      renderWithRouter(['/cases/create']);
      expect(await screen.findByText('Create case')).toBeInTheDocument();
    });

    it('shows the no privileges page if the user does not have create privileges', async () => {
      renderWithRouter(['/cases/create'], noCreateCasesPermissions());
      expect(await screen.findByText('Privileges required')).toBeInTheDocument();
    });
  });

  describe('Cases settings', () => {
    it('navigates to the cases settings page', async () => {
      renderWithRouter(['/cases/configure']);
      expect(await screen.findByText('Settings')).toBeInTheDocument();
    });

    it('shows the no privileges page if the user does not have settings privileges', async () => {
      renderWithRouter(['/cases/configure'], noCasesSettingsPermission());
      expect(await screen.findByText('Privileges required')).toBeInTheDocument();
    });
  });
});
