/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { CloudLinks } from './cloud_links';

const createCloudMock = (overrides: Record<string, unknown> = {}): CloudStart =>
  ({
    isCloudEnabled: true,
    baseUrl: 'https://cloud.elastic.co',
    organizationUrl: 'https://cloud.elastic.co/account/members',
    getPrivilegedUrls: jest.fn().mockResolvedValue({
      billingUrl: 'https://cloud.elastic.co/billing',
    }),
    ...overrides,
  } as unknown as CloudStart);

const renderCloudLinks = (cloud?: CloudStart) =>
  render(
    <EuiThemeProvider>
      <CloudLinks cloud={cloud} />
    </EuiThemeProvider>
  );

describe('CloudLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when cloud is undefined', () => {
    const { container } = renderCloudLinks(undefined);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when cloud is not enabled', async () => {
    const { container } = renderCloudLinks(createCloudMock({ isCloudEnabled: false }));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when baseUrl is missing', async () => {
    const { container } = renderCloudLinks(createCloudMock({ baseUrl: undefined }));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders cloud logo and all links when cloud is enabled', async () => {
    const { getByTestId } = renderCloudLinks(createCloudMock());

    await waitFor(() => {
      expect(getByTestId('searchHomepageCloudLink-home')).toBeInTheDocument();
      expect(getByTestId('searchHomepageCloudLink-elasticCloud')).toBeInTheDocument();
      expect(getByTestId('searchHomepageCloudLink-usage')).toBeInTheDocument();
      expect(getByTestId('searchHomepageCloudLink-organization')).toBeInTheDocument();
    });
  });

  it('uses URLs directly from cloud object and getPrivilegedUrls', async () => {
    const { getByTestId } = renderCloudLinks(createCloudMock());

    await waitFor(() => {
      expect(getByTestId('searchHomepageCloudLink-home')).toHaveAttribute(
        'href',
        'https://cloud.elastic.co'
      );
      expect(getByTestId('searchHomepageCloudLink-elasticCloud')).toHaveAttribute(
        'href',
        'https://cloud.elastic.co'
      );
      expect(getByTestId('searchHomepageCloudLink-organization')).toHaveAttribute(
        'href',
        'https://cloud.elastic.co/account/members'
      );
    });

    await waitFor(() => {
      expect(getByTestId('searchHomepageCloudLink-usage')).toHaveAttribute(
        'href',
        'https://cloud.elastic.co/billing'
      );
    });
  });

  it('does not render usage link when user lacks billing access', async () => {
    const cloud = createCloudMock({
      getPrivilegedUrls: jest.fn().mockResolvedValue({}),
    });
    const { queryByTestId } = renderCloudLinks(cloud);

    await waitFor(() => {
      expect(cloud.getPrivilegedUrls).toHaveBeenCalled();
    });

    expect(queryByTestId('searchHomepageCloudLink-usage')).not.toBeInTheDocument();
  });

  it('does not render usage link when getPrivilegedUrls rejects', async () => {
    const cloud = createCloudMock({
      getPrivilegedUrls: jest.fn().mockRejectedValue(new Error('forbidden')),
    });
    const { queryByTestId } = renderCloudLinks(cloud);

    await waitFor(() => {
      expect(cloud.getPrivilegedUrls).toHaveBeenCalled();
    });

    expect(queryByTestId('searchHomepageCloudLink-usage')).not.toBeInTheDocument();
  });

  it('opens links in a new tab', async () => {
    const { getByTestId } = renderCloudLinks(createCloudMock());

    await waitFor(() => {
      expect(getByTestId('searchHomepageCloudLink-usage')).toBeInTheDocument();
    });

    expect(getByTestId('searchHomepageCloudLink-home')).toHaveAttribute('target', '_blank');
    expect(getByTestId('searchHomepageCloudLink-elasticCloud')).toHaveAttribute('target', '_blank');
    expect(getByTestId('searchHomepageCloudLink-organization')).toHaveAttribute('target', '_blank');
    expect(getByTestId('searchHomepageCloudLink-usage')).toHaveAttribute('target', '_blank');
  });
});
