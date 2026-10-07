/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { PackageInfo } from '../../../../../types';

import { PackageDocumentationModal } from './package_documentation_modal';

const mockNavigateToApp = jest.fn();
const mockBasepathPrepend = jest.fn((url: string) => `http://localhost:5620${url}`);
const mockGetFilePath = jest.fn((path: string) => `/api/fleet/epm/packages${path}`);
const mockSendGetFileByPath = jest.fn();

jest.mock('../../../../../hooks', () => ({
  useStartServices: jest.fn(() => ({
    http: { basePath: { prepend: mockBasepathPrepend } },
    application: { navigateToApp: mockNavigateToApp },
  })),
  sendGetFileByPath: (...args: any[]) => mockSendGetFileByPath(...args),
}));

jest.mock('../../../../../services', () => ({
  epmRouteService: { getFilePath: (path: string) => mockGetFilePath(path) },
}));

jest.mock('../../../../../../integrations/sections/epm/screens/detail/overview/readme', () => ({
  // Kibana's RTL setup maps getByTestId to data-test-subj
  Readme: ({ markdown }: { markdown?: string }) => (
    <div data-test-subj="readme">{markdown ?? 'loading'}</div>
  ),
}));

jest.mock('../../../../../components', () => ({
  PackageIcon: () => <div data-testid="package-icon" />,
}));

const basePackageInfo: PackageInfo = {
  name: 'nginx',
  title: 'Nginx',
  version: '1.3.0',
  description: 'Nginx integration',
  type: 'integration',
  categories: ['web', 'security'],
  release: 'ga',
  format_version: '1.0.0',
  owner: { github: 'elastic/fleet' },
  policy_templates: [],
  data_streams: [],
  assets: {},
} as any;

const renderModal = (
  props: Partial<React.ComponentProps<typeof PackageDocumentationModal>> = {}
) => {
  const onClose = jest.fn();
  return {
    onClose,
    ...render(
      <I18nProvider>
        <PackageDocumentationModal packageInfo={basePackageInfo} onClose={onClose} {...props} />
      </I18nProvider>
    ),
  };
};

describe('PackageDocumentationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch readme when packageInfo.readme is absent', () => {
    renderModal({ packageInfo: { ...basePackageInfo, readme: undefined } });
    expect(mockSendGetFileByPath).not.toHaveBeenCalled();
  });

  it('fetches readme and passes markdown to Readme component', async () => {
    mockSendGetFileByPath.mockResolvedValue({ data: '# Hello' });
    renderModal({ packageInfo: { ...basePackageInfo, readme: '/some/readme.md' } });

    expect(mockSendGetFileByPath).toHaveBeenCalledWith('/some/readme.md');
    await waitFor(() => expect(screen.getByTestId('readme')).toHaveTextContent('# Hello'));
  });

  it('sets markdown to empty string on fetch error so Readme receives defined content', async () => {
    mockSendGetFileByPath.mockRejectedValue(new Error('network error'));
    renderModal({ packageInfo: { ...basePackageInfo, readme: '/some/readme.md' } });

    // After rejection, the catch sets markdown to ''; the Readme mock renders an empty element
    await waitFor(() => expect(screen.getByTestId('readme').textContent).toBe(''));
  });

  it('constructs screenshot URL via epmRouteService and basePath', () => {
    const packageInfo: PackageInfo = {
      ...basePackageInfo,
      screenshots: [{ src: '/img/screenshot.png', title: 'Main view', type: 'image/png' }],
    } as any;
    renderModal({ packageInfo });

    expect(mockGetFilePath).toHaveBeenCalledWith('/package/nginx/1.3.0/img/screenshot.png');
    expect(mockBasepathPrepend).toHaveBeenCalledWith(
      '/api/fleet/epm/packages/package/nginx/1.3.0/img/screenshot.png'
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('screenshot.png'));
  });

  it('does not render screenshot section when screenshots are absent', () => {
    renderModal({ packageInfo: { ...basePackageInfo, screenshots: [] } });
    expect(screen.queryByText('Screenshot')).toBeNull();
  });

  it('renders version in the details list', () => {
    renderModal();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('1.3.0')).toBeInTheDocument();
  });

  it('renders categories in the details list', () => {
    renderModal();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('web, security')).toBeInTheDocument();
  });

  it('omits the Category row when categories are empty', () => {
    renderModal({ packageInfo: { ...basePackageInfo, categories: [] } });
    expect(screen.queryByText('Category')).toBeNull();
  });

  it('navigates to the integration overview when "Integration details" is clicked', async () => {
    renderModal();
    await act(async () => {
      await userEvent.click(screen.getByTestId('packageDocumentationModalViewDetails'));
    });
    expect(mockNavigateToApp).toHaveBeenCalledWith('integrations', {
      path: '/detail/nginx-1.3.0/overview',
    });
  });

  it('calls onClose when the Close button is clicked', async () => {
    const { onClose } = renderModal();
    await act(async () => {
      await userEvent.click(screen.getByTestId('packageDocumentationModalClose'));
    });
    expect(onClose).toHaveBeenCalled();
  });
});
