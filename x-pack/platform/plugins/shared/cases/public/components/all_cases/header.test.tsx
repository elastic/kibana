/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { buildCasesPermissions, renderWithTestingProviders } from '../../common/mock';
import { CasesTableHeader } from './header';

describe('CasesTableHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the create new case button when the user has create privileges', () => {
    renderWithTestingProviders(<CasesTableHeader actionsErrors={[]} />, {
      wrapperProps: { permissions: buildCasesPermissions({ update: false, create: true }) },
    });

    expect(screen.getByTestId('createNewCaseBtn')).toBeInTheDocument();
  });

  it('does not display the create new case button when the user does not have create privileges', () => {
    renderWithTestingProviders(<CasesTableHeader actionsErrors={[]} />, {
      wrapperProps: { permissions: buildCasesPermissions({ create: false }) },
    });

    expect(screen.queryByTestId('createNewCaseBtn')).not.toBeInTheDocument();
  });

  it('displays the configure button when the user has update privileges', () => {
    renderWithTestingProviders(<CasesTableHeader actionsErrors={[]} />, {
      wrapperProps: { permissions: buildCasesPermissions({ create: false, update: true }) },
    });

    expect(screen.getByTestId('configure-case-button')).toBeInTheDocument();
  });

  it('does not display the configure button when the user does not have settings privileges', () => {
    renderWithTestingProviders(<CasesTableHeader actionsErrors={[]} />, {
      wrapperProps: { permissions: buildCasesPermissions({ settings: false }) },
    });

    expect(screen.queryByTestId('configure-case-button')).not.toBeInTheDocument();
  });
});
