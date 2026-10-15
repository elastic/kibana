/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS, APP_MENU_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';

import { buildCasesPermissions, renderWithTestingProviders } from '../../../common/mock';
import { KibanaServices } from '../../../common/lib/kibana';
import {
  GENERAL_CASES_OWNER,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../../../common/constants';
import { CasesListAppHeader } from './cases_list_app_header';
import { getListMenu } from './header_menu';
import { allCasesPermissions } from '../../../common/mock/permissions';
import * as listI18n from '../translations';

jest.mock('../../../common/navigation/hooks');

describe('CasesListAppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the app header with the Cases title', () => {
    renderWithTestingProviders(<CasesListAppHeader />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Cases');
  });

  it('displays the create new case action when the user has create privileges', () => {
    renderWithTestingProviders(<CasesListAppHeader />, {
      wrapperProps: { permissions: buildCasesPermissions({ create: true }) },
    });

    expect(screen.getByTestId('createNewCaseBtn')).toBeInTheDocument();
  });

  it('does not display the create new case action when the user does not have create privileges', () => {
    renderWithTestingProviders(<CasesListAppHeader />, {
      wrapperProps: { permissions: buildCasesPermissions({ create: false }) },
    });

    expect(screen.queryByTestId('createNewCaseBtn')).not.toBeInTheDocument();
  });

  it('displays the configure button when the user has settings privileges', async () => {
    renderWithTestingProviders(<CasesListAppHeader />, {
      wrapperProps: { permissions: buildCasesPermissions({ settings: true }) },
    });

    await openAppMenuOverflow();

    expect(await screen.findByTestId('configure-case-button')).toBeInTheDocument();
  });

  it('does not display the configure button when the user does not have settings privileges', () => {
    renderWithTestingProviders(<CasesListAppHeader />, {
      wrapperProps: { permissions: buildCasesPermissions({ settings: false }) },
    });

    expect(screen.queryByTestId(APP_MENU_TEST_SUBJECTS.overflowButton)).not.toBeInTheDocument();
    expect(screen.queryByTestId('configure-case-button')).not.toBeInTheDocument();
  });

  it('displays both the create action and configure button with create and settings privileges', async () => {
    renderWithTestingProviders(<CasesListAppHeader />, {
      wrapperProps: { permissions: buildCasesPermissions({ create: true, settings: true }) },
    });

    expect(screen.getByTestId('createNewCaseBtn')).toBeInTheDocument();

    await openAppMenuOverflow();

    expect(await screen.findByTestId('configure-case-button')).toBeInTheDocument();
  });

  it('does not display any menu items when the user has no create or settings privileges', () => {
    renderWithTestingProviders(<CasesListAppHeader />, {
      wrapperProps: { permissions: buildCasesPermissions({ create: false, settings: false }) },
    });

    expect(screen.queryByTestId('createNewCaseBtn')).not.toBeInTheDocument();
    expect(screen.queryByTestId(APP_MENU_TEST_SUBJECTS.overflowButton)).not.toBeInTheDocument();
  });

  describe('templates button', () => {
    let getConfigSpy: jest.SpyInstance;

    const enableTemplates = (enabled = true) => {
      getConfigSpy = jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled } } as ReturnType<typeof KibanaServices.getConfig>);
    };

    const createCoreStartWithChromeStyle = (chromeStyle: 'classic' | 'project') => {
      const coreStart = coreMock.createStart();
      coreStart.chrome.getChromeStyle$.mockReturnValue(new BehaviorSubject(chromeStyle));
      coreStart.chrome.getChromeStyle.mockReturnValue(chromeStyle);
      return coreStart;
    };

    const renderHeader = ({
      owner,
      chromeStyle = 'classic',
      manageTemplates = true,
    }: {
      owner: string[];
      chromeStyle?: 'classic' | 'project';
      manageTemplates?: boolean;
    }) =>
      renderWithTestingProviders(<CasesListAppHeader />, {
        wrapperProps: {
          owner,
          coreStart: createCoreStartWithChromeStyle(chromeStyle),
          permissions: buildCasesPermissions({ manageTemplates }),
        },
      });

    afterEach(() => {
      getConfigSpy?.mockRestore();
    });

    it('displays the templates button in Stack Management, which has no Cases sub-nav', async () => {
      enableTemplates();
      renderHeader({ owner: [GENERAL_CASES_OWNER], chromeStyle: 'project' });

      await openAppMenuOverflow();

      expect(await screen.findByTestId('cases-templates-button')).toBeInTheDocument();
    });

    it('displays the templates button for Observability in the classic nav', async () => {
      enableTemplates();
      renderHeader({ owner: [OBSERVABILITY_OWNER], chromeStyle: 'classic' });

      await openAppMenuOverflow();

      expect(await screen.findByTestId('cases-templates-button')).toBeInTheDocument();
    });

    it('does not display the templates button for Observability in a solution nav', async () => {
      enableTemplates();
      renderHeader({ owner: [OBSERVABILITY_OWNER], chromeStyle: 'project' });

      await openAppMenuOverflow();

      expect(screen.queryByTestId('cases-templates-button')).not.toBeInTheDocument();
    });

    it.each(['classic', 'project'] as const)(
      'does not display the templates button for Security in the %s nav',
      async (chromeStyle) => {
        enableTemplates();
        renderHeader({ owner: [SECURITY_SOLUTION_OWNER], chromeStyle });

        await openAppMenuOverflow();

        expect(screen.queryByTestId('cases-templates-button')).not.toBeInTheDocument();
      }
    );

    it('does not display the templates button when templates are disabled', () => {
      enableTemplates(false);
      renderHeader({ owner: [GENERAL_CASES_OWNER] });

      expect(screen.queryByTestId('cases-templates-button')).not.toBeInTheDocument();
    });

    it('does not display the templates button when the user lacks manageTemplates permission', () => {
      enableTemplates();
      renderHeader({ owner: [GENERAL_CASES_OWNER], manageTemplates: false });

      expect(screen.queryByTestId('cases-templates-button')).not.toBeInTheDocument();
    });
  });

  describe('action license tooltip (getListMenu)', () => {
    const baseArgs = {
      permissions: allCasesPermissions(),
      showTemplatesButton: false,
      navigateToCreateCase: jest.fn(),
      navigateToConfigureCases: jest.fn(),
      navigateToCasesTemplates: jest.fn(),
      getCasesTemplatesUrl: jest.fn().mockReturnValue('/templates'),
    };

    it('does not set tooltipContent when action license is fully enabled', () => {
      const menu = getListMenu({
        ...baseArgs,
        actionLicense: {
          id: '.jira',
          name: 'Jira',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
        },
      });

      const configureItem = menu.items?.find((item) => item.id === 'configureCases');
      expect(configureItem).toBeDefined();
      expect(configureItem?.tooltipContent).toBeUndefined();
    });

    it('sets license tooltip when enabledInLicense is false', () => {
      const menu = getListMenu({
        ...baseArgs,
        actionLicense: {
          id: '.jira',
          name: 'Jira',
          enabled: false,
          enabledInConfig: true,
          enabledInLicense: false,
        },
      });

      const configureItem = menu.items?.find((item) => item.id === 'configureCases');
      expect(configureItem).toBeDefined();
      expect(configureItem?.tooltipContent).toBe(listI18n.ACTION_LICENSE_REQUIRED);
    });

    it('sets config tooltip when enabledInConfig is false', () => {
      const menu = getListMenu({
        ...baseArgs,
        actionLicense: {
          id: '.jira',
          name: 'Jira',
          enabled: false,
          enabledInConfig: false,
          enabledInLicense: true,
        },
      });

      const configureItem = menu.items?.find((item) => item.id === 'configureCases');
      expect(configureItem).toBeDefined();
      expect(configureItem?.tooltipContent).toBe(listI18n.ACTION_LICENSE_DISABLED_BY_CONFIG);
    });

    it('does not set tooltipContent when actionLicense is null', () => {
      const menu = getListMenu({ ...baseArgs, actionLicense: null });

      const configureItem = menu.items?.find((item) => item.id === 'configureCases');
      expect(configureItem).toBeDefined();
      expect(configureItem?.tooltipContent).toBeUndefined();
    });
  });
});
