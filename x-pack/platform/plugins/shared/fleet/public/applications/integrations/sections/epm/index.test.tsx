/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockUseAutomaticImportAuthz = jest.fn();
jest.mock('../../hooks', () => ({
  useStartServices: () => ({ automaticImport: {} }),
  useBreadcrumbs: jest.fn(),
  useAutomaticImportAuthz: () => mockUseAutomaticImportAuthz(),
  IntegrationsStateContextProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('./screens/home', () => ({
  EPMHomePage: () => <div data-test-subj="epmHomePage" />,
}));
jest.mock('./screens/detail', () => ({ Detail: () => null }));
jest.mock('./screens/policy', () => ({ Policy: () => null }));
jest.mock('./screens/detail/custom_languages_overview', () => ({
  CustomLanguagesOverview: () => null,
}));
jest.mock('./screens/create', () => ({
  CreateIntegration: () => <div data-test-subj="createIntegrationScreen" />,
}));
jest.mock('../../../fleet/sections/agent_policy/copy_package_policy_page', () => ({
  CopyPackagePolicyPage: () => null,
}));
jest.mock('../../../fleet/sections/agent_policy/create_package_policy_page', () => ({
  CreatePackagePolicyPage: () => null,
}));

import { EPMApp } from '.';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <EPMApp />
    </MemoryRouter>
  );

describe('EPMApp create integration routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mounts the create integration screen on /create when the user can create', () => {
    mockUseAutomaticImportAuthz.mockReturnValue({ canCreate: true });

    renderAt('/create');

    expect(screen.getByTestId('createIntegrationScreen')).toBeInTheDocument();
    expect(screen.queryByTestId('epmHomePage')).not.toBeInTheDocument();
  });

  it('falls back to the integrations home on /create when the user cannot create', () => {
    mockUseAutomaticImportAuthz.mockReturnValue({ canCreate: false });

    renderAt('/create');

    expect(screen.queryByTestId('createIntegrationScreen')).not.toBeInTheDocument();
    expect(screen.getByTestId('epmHomePage')).toBeInTheDocument();
  });

  it('falls back to the integrations home on /upload when the user cannot create', () => {
    mockUseAutomaticImportAuthz.mockReturnValue({ canCreate: false });

    renderAt('/upload');

    expect(screen.queryByTestId('createIntegrationScreen')).not.toBeInTheDocument();
    expect(screen.getByTestId('epmHomePage')).toBeInTheDocument();
  });
});
