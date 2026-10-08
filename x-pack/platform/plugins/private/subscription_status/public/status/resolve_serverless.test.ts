/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudPrivilegedUrls } from '@kbn/cloud-plugin/public';
import type { ProjectType, ServerlessCloud } from './resolve_serverless';
import { resolveServerlessStatus } from './resolve_serverless';

const BASE_URL = 'https://cloud.elastic.co';
const BILLING_URL = `${BASE_URL}/billing`;
const PRICING_URL = `${BASE_URL}/cloud-pricing-table`;

interface ResolveOptions {
  isServerlessEnabled?: boolean;
  organizationInTrial?: boolean;
  projectType?: ProjectType;
  baseUrl?: string;
  getPrivilegedUrls?: () => Promise<CloudPrivilegedUrls>;
  csp?: string;
  region?: string;
}

const DEFAULTS: ResolveOptions = {
  isServerlessEnabled: true,
  organizationInTrial: true,
  projectType: 'search',
  baseUrl: BASE_URL,
  getPrivilegedUrls: async () => ({ billingUrl: BILLING_URL }),
  csp: 'aws',
  region: 'us-east-1',
};

// Spread rather than default params, so an explicit `undefined` overrides the default.
const resolve = (options: ResolveOptions = {}) => {
  const {
    isServerlessEnabled,
    organizationInTrial,
    projectType,
    baseUrl,
    getPrivilegedUrls,
    csp,
    region,
  } = { ...DEFAULTS, ...options };
  const cloud: ServerlessCloud = {
    isServerlessEnabled: Boolean(isServerlessEnabled),
    serverless: { projectId: 'project-id', projectType, organizationInTrial },
    getPrivilegedUrls: getPrivilegedUrls ?? (async () => ({})),
    getUrls: () => ({ baseUrl }),
  };
  return resolveServerlessStatus({ cloud, csp, region });
};

describe('resolveServerlessStatus', () => {
  it.each([
    ['the project is not serverless', { isServerlessEnabled: false }],
    ['the organization is not in trial', { organizationInTrial: false }],
  ])('shows no badge when %s', async (_, options) => {
    expect(await resolve(options)).toBeUndefined();
  });

  it.each([
    ['the user has no billing access', async () => ({})],
    ['privileged URLs fail to load', () => Promise.reject(new Error('boom'))],
  ])('shows the tooltip when %s', async (_, getPrivilegedUrls) => {
    expect(await resolve({ getPrivilegedUrls })).toEqual({
      kind: 'tooltip',
      label: 'Trial',
      tooltip: 'Contact your administrator to update the subscription',
      projectType: 'search',
    });
  });

  it('shows the popover with billing and pricing links for billing admins', async () => {
    expect(await resolve()).toEqual({
      kind: 'popover',
      label: 'Trial',
      title: 'Elasticsearch Serverless',
      subtitle: 'AWS (us-east-1)',
      description: "You're on an Elastic trial.",
      primaryAction: { id: 'subscribe', label: 'Subscribe', href: BILLING_URL },
      secondaryAction: {
        id: 'view_pricing',
        label: 'View pricing',
        href: `${PRICING_URL}?productType=serverless&solution=elasticsearch&provider=aws&region=us-east-1`,
      },
      projectType: 'search',
    });
  });

  it.each<[ProjectType, string, string]>([
    ['observability', 'Observability Serverless', 'observability'],
    ['security', 'Security Serverless', 'security'],
    ['vectordb', 'Vector Database Serverless', 'vectordb'],
  ])(
    'maps the %s project to its title and pricing solution',
    async (projectType, title, solution) => {
      expect(await resolve({ projectType })).toMatchObject({
        title,
        secondaryAction: { href: expect.stringContaining(`solution=${solution}&`) },
      });
    }
  );

  it('omits the region subtitle and provider when the provider is unknown', async () => {
    expect(await resolve({ csp: undefined })).toMatchObject({
      subtitle: undefined,
      secondaryAction: {
        href: `${PRICING_URL}?productType=serverless&solution=elasticsearch&region=us-east-1`,
      },
    });
  });

  it('builds the pricing link from a base URL with a trailing slash', async () => {
    expect(await resolve({ baseUrl: `${BASE_URL}/` })).toMatchObject({
      secondaryAction: { href: expect.stringMatching(`^${PRICING_URL}\\?`) },
    });
  });

  it('omits the pricing link without a Cloud base URL', async () => {
    expect(await resolve({ baseUrl: undefined })).toMatchObject({
      kind: 'popover',
      secondaryAction: undefined,
    });
  });
});
