/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';

const mockLoadAsync = jest.fn();
jest.mock('jszip', () => ({
  __esModule: true,
  default: { loadAsync: (...args: unknown[]) => mockLoadAsync(...args) },
}));

const mockParseYaml = jest.fn();
jest.mock('yaml', () => ({ parse: (...args: unknown[]) => mockParseYaml(...args) }));

const mockFetchTakenPackageNames = jest.fn();
jest.mock('../../../common/lib/package_names', () => ({
  fetchTakenPackageNames: (...args: unknown[]) => mockFetchTakenPackageNames(...args),
}));

const mockRunInstallPackage = jest.fn();
const mockGetIntegrationNameFromResponse = jest.fn();
jest.mock('../../../common', () => ({
  runInstallPackage: (...args: unknown[]) => mockRunInstallPackage(...args),
  getIntegrationNameFromResponse: (...args: unknown[]) =>
    mockGetIntegrationNameFromResponse(...args),
  fetchTakenPackageNames: (...args: unknown[]) => mockFetchTakenPackageNames(...args),
}));

jest.mock('../../../common/hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {},
      application: {
        getUrlForApp: jest.fn(() => '/app/integrations'),
        navigateToUrl: jest.fn(),
      },
      licensing: { license$: { subscribe: jest.fn() } },
    },
  }),
}));

jest.mock('react-use/lib/useObservable', () =>
  jest.fn(() => ({ isAvailable: true, isActive: true, hasAtLeast: () => true }))
);

jest.mock('../../telemetry_context', () => ({
  useTelemetry: () => ({ reportCancelButtonClicked: jest.fn() }),
}));

jest.mock('./docs_link_subtitle', () => ({
  DocsLinkSubtitle: () => null,
}));

jest.mock('../../license_paywall/license_paywall_card', () => ({
  LicensePaywallCard: () => null,
}));

import { CreateIntegrationUpload } from './create_integration_upload';

const makeZipWithPackageName = (packageName: string) => ({
  files: {
    [`${packageName}-1.0.0/manifest.yml`]: {
      dir: false,
      name: `${packageName}-1.0.0/manifest.yml`,
      async: jest.fn().mockResolvedValue(`name: ${packageName}\nversion: 1.0.0\n`),
    },
  },
});

const selectFile = async (container: HTMLElement, fileName = 'test.zip') => {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['zip'], fileName, { type: 'application/zip' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });

  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
};

const renderUpload = () => render(<CreateIntegrationUpload />);

describe('CreateIntegrationUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchTakenPackageNames.mockResolvedValue(new Set<string>());
    mockParseYaml.mockReturnValue({ name: 'test_package' });
    mockLoadAsync.mockResolvedValue(makeZipWithPackageName('test_package'));
  });

  describe('file selection validation', () => {
    it('shows an error when the package name is already taken', async () => {
      mockFetchTakenPackageNames.mockResolvedValue(new Set(['test_package']));

      const { container, getByText } = renderUpload();
      await selectFile(container);

      await waitFor(() => {
        expect(getByText(/A package named "test_package" already exists/)).toBeInTheDocument();
      });
    });

    it('shows no error when the package name is free', async () => {
      const { container, queryByText } = renderUpload();
      await selectFile(container);

      await waitFor(() => expect(mockFetchTakenPackageNames).toHaveBeenCalled());
      expect(queryByText(/already exists/)).not.toBeInTheDocument();
    });

    it('disables the install button when the name is taken', async () => {
      mockFetchTakenPackageNames.mockResolvedValue(new Set(['test_package']));

      const { container, getByTestId } = renderUpload();
      await selectFile(container);

      await waitFor(() => {
        expect(getByTestId('buttonsFooter-actionButton')).toBeDisabled();
      });
    });

    it('enables the install button when the name is free', async () => {
      const { container, getByTestId } = renderUpload();
      await selectFile(container);

      await waitFor(() => {
        expect(getByTestId('buttonsFooter-actionButton')).not.toBeDisabled();
      });
    });

    it('clears a previous error when a new file is selected', async () => {
      mockFetchTakenPackageNames
        .mockResolvedValueOnce(new Set(['test_package']))
        .mockResolvedValueOnce(new Set());

      const { container, queryByText } = renderUpload();

      await selectFile(container);
      await waitFor(() => expect(queryByText(/already exists/)).toBeInTheDocument());

      await selectFile(container, 'other.zip');
      await waitFor(() => expect(queryByText(/already exists/)).not.toBeInTheDocument());
    });

    it('shows no error when zip parsing fails', async () => {
      mockLoadAsync.mockRejectedValue(new Error('bad zip'));

      const { container, queryByText } = renderUpload();
      await selectFile(container);

      await waitFor(() => expect(mockLoadAsync).toHaveBeenCalled());
      expect(queryByText(/already exists/)).not.toBeInTheDocument();
    });

    it('shows no error when manifest has no name field', async () => {
      mockParseYaml.mockReturnValue({ version: '1.0.0' });

      const { container, queryByText } = renderUpload();
      await selectFile(container);

      await waitFor(() => expect(mockParseYaml).toHaveBeenCalled());
      expect(queryByText(/already exists/)).not.toBeInTheDocument();
    });
  });

  describe('install button initial state', () => {
    it('is disabled before any file is selected', async () => {
      const { getByTestId } = renderUpload();
      await act(async () => {});
      expect(getByTestId('buttonsFooter-actionButton')).toBeDisabled();
    });
  });
});
