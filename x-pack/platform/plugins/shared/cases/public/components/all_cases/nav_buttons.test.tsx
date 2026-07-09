/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import {
  noCasesSettingsPermission,
  noCreateCasesPermissions,
  buildCasesPermissions,
  renderWithTestingProviders,
} from '../../common/mock';
import { KibanaServices } from '../../common/lib/kibana';
import { NavButtons } from './nav_buttons';

describe('NavButtons', () => {
  it('shows the configure case button', () => {
    renderWithTestingProviders(<NavButtons actionsErrors={[]} />);

    expect(screen.getByTestId('configure-case-button')).toBeInTheDocument();
  });

  it('does not render the case create button with no create permissions', () => {
    renderWithTestingProviders(<NavButtons actionsErrors={[]} />, {
      wrapperProps: { permissions: noCreateCasesPermissions() },
    });

    expect(screen.queryByTestId('createNewCaseBtn')).not.toBeInTheDocument();
  });

  it('does not render the case configure button with no settings permissions', () => {
    renderWithTestingProviders(<NavButtons actionsErrors={[]} />, {
      wrapperProps: { permissions: noCasesSettingsPermission() },
    });

    expect(screen.queryByTestId('configure-case-button')).not.toBeInTheDocument();
  });

  it('does not render any button with no create and no settings permissions', () => {
    renderWithTestingProviders(<NavButtons actionsErrors={[]} />, {
      wrapperProps: { permissions: buildCasesPermissions({ create: false, settings: false }) },
    });

    expect(screen.queryByTestId('createNewCaseBtn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('configure-case-button')).not.toBeInTheDocument();
  });

  describe('templates button', () => {
    let getConfigSpy: jest.SpyInstance;

    afterEach(() => {
      getConfigSpy?.mockRestore();
    });

    it('does not render the templates button when the templates feature flag is disabled', () => {
      renderWithTestingProviders(<NavButtons actionsErrors={[]} />);

      expect(screen.queryByTestId('cases-templates-button')).not.toBeInTheDocument();
    });

    it('renders the templates button when the templates feature flag is enabled and the user has manageTemplates permission', () => {
      getConfigSpy = jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

      renderWithTestingProviders(<NavButtons actionsErrors={[]} />);

      expect(screen.getByTestId('cases-templates-button')).toBeInTheDocument();
    });

    it('does not render the templates button when the user lacks manageTemplates permission', () => {
      getConfigSpy = jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

      renderWithTestingProviders(<NavButtons actionsErrors={[]} />, {
        wrapperProps: { permissions: buildCasesPermissions({ manageTemplates: false }) },
      });

      expect(screen.queryByTestId('cases-templates-button')).not.toBeInTheDocument();
    });

    it('renders the templates button even when the user lacks settings permission', () => {
      getConfigSpy = jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

      renderWithTestingProviders(<NavButtons actionsErrors={[]} />, {
        wrapperProps: { permissions: buildCasesPermissions({ settings: false }) },
      });

      expect(screen.getByTestId('cases-templates-button')).toBeInTheDocument();
      expect(screen.queryByTestId('configure-case-button')).not.toBeInTheDocument();
    });
  });
});
