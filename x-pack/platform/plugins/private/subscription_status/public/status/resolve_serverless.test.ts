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
const BILLING_URL = `${BASE_URL}/billing/overview#uTargetOrganizationId=org-1`;

interface ResolveOptions {
  isServerlessEnabled?: boolean;
  organizationInTrial?: boolean;
  projectType?: ProjectType;
  getPrivilegedUrls?: () => Promise<CloudPrivilegedUrls>;
  csp?: string;
  region?: string;
}

const DEFAULTS: ResolveOptions = {
  isServerlessEnabled: true,
  organizationInTrial: true,
  projectType: 'search',
  getPrivilegedUrls: async () => ({ billingUrl: BILLING_URL }),
  csp: 'aws',
  region: 'us-east-1',
};

// Spread rather than default params, so an explicit `undefined` overrides the default.
const resolve = (options: ResolveOptions = {}) => {
  const { isServerlessEnabled, organizationInTrial, projectType, getPrivilegedUrls, csp, region } =
    { ...DEFAULTS, ...options };
  const cloud: ServerlessCloud = {
    isServerlessEnabled: Boolean(isServerlessEnabled),
    serverless: { projectId: 'project-id', projectType, organizationInTrial },
    getPrivilegedUrls: getPrivilegedUrls ?? (async () => ({})),
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

  it('shows the popover with subscribe and trial summary links for billing admins', async () => {
    expect(await resolve()).toEqual({
      kind: 'popover',
      label: 'Trial',
      title: 'Elasticsearch Serverless',
      subtitle: 'AWS (us-east-1)',
      description: "You're on an Elastic Cloud trial.",
      primaryAction: {
        id: 'subscribe',
        label: 'Subscribe',
        href: `${BASE_URL}/billing/overview?intent=subscribe#uTargetOrganizationId=org-1`,
        external: true,
      },
      secondaryAction: {
        id: 'view_pricing',
        label: 'View pricing',
        href: `${BASE_URL}/billing/overview?intent=trial_summary#uTargetOrganizationId=org-1`,
        external: true,
      },
      projectType: 'search',
    });
  });

  it.each<[ProjectType, string]>([
    ['observability', 'Elastic Observability Serverless'],
    ['security', 'Elastic Security Serverless'],
    ['vectordb', 'Elasticsearch Vector Database'],
  ])('maps the %s project to its title', async (projectType, title) => {
    expect(await resolve({ projectType })).toMatchObject({ title });
  });

  it('omits the region subtitle when the provider is unknown', async () => {
    expect(await resolve({ csp: undefined })).toMatchObject({ subtitle: undefined });
  });
});
