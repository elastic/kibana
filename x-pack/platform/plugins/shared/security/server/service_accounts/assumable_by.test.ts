/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TrustedPlatformServiceAccountName, UiamProjectType } from '@kbn/core-security-server';

import { buildAssumableBy, grantsTrustedPlatformAssumers } from './assumable_by';

describe('buildAssumableBy', () => {
  it('scopes the service account to the current project', () => {
    expect(
      buildAssumableBy({
        organizationId: 'organization-id',
        projectId: 'project-id',
        projectType: 'security',
      })
    ).toEqual([
      {
        type: 'project-service-account',
        organization_id: 'organization-id',
        project_type: 'security',
        project_id: 'project-id',
      },
    ]);
  });

  it.each<UiamProjectType>([
    'elasticsearch',
    'observability',
    'security',
    'vectordb',
    'workplaceai',
  ])('passes through the `%s` project type verbatim', (projectType) => {
    const [entry] = buildAssumableBy({
      organizationId: 'organization-id',
      projectId: 'project-id',
      projectType,
    });

    expect(entry).toMatchObject({ project_type: projectType });
  });

  it('adds the Relay platform service account from the server-owned id', () => {
    expect(
      buildAssumableBy(
        {
          organizationId: 'organization-id',
          projectId: 'project-id',
          projectType: 'security',
        },
        ['relay']
      )
    ).toEqual([
      {
        type: 'project-service-account',
        organization_id: 'organization-id',
        project_type: 'security',
        project_id: 'project-id',
      },
      { type: 'platform-service-account', service_account_id: 'relay-service' },
    ]);
  });

  it('adds the Relay assumer once when the name is repeated', () => {
    const assumableBy = buildAssumableBy(
      {
        organizationId: 'organization-id',
        projectId: 'project-id',
        projectType: 'observability',
      },
      ['relay', 'relay']
    );

    expect(assumableBy.filter((entry) => entry.type === 'platform-service-account')).toEqual([
      { type: 'platform-service-account', service_account_id: 'relay-service' },
    ]);
  });

  it('rejects an assumer the server does not know and does not echo the name', () => {
    const attacker = 'attacker-principal';
    expect(() =>
      buildAssumableBy(
        {
          organizationId: 'organization-id',
          projectId: 'project-id',
          projectType: 'security',
        },
        [attacker] as unknown as readonly TrustedPlatformServiceAccountName[]
      )
    ).toThrow(/unknown platform service account assumer/);

    try {
      buildAssumableBy(
        {
          organizationId: 'organization-id',
          projectId: 'project-id',
          projectType: 'security',
        },
        [attacker] as unknown as readonly TrustedPlatformServiceAccountName[]
      );
    } catch (error) {
      expect(String(error)).not.toContain(attacker);
    }
  });
});

describe('grantsTrustedPlatformAssumers', () => {
  const project = {
    type: 'project-service-account' as const,
    organization_id: 'organization-id',
    project_type: 'security' as const,
    project_id: 'project-id',
  };

  it('accepts an account that echoes the Relay platform assumer', () => {
    expect(
      grantsTrustedPlatformAssumers(
        [project, { type: 'platform-service-account', service_account_id: 'relay-service' }],
        ['relay']
      )
    ).toBe(true);
  });

  it('rejects an account that omits Relay or names some other principal', () => {
    expect(grantsTrustedPlatformAssumers([project], ['relay'])).toBe(false);
    expect(
      grantsTrustedPlatformAssumers(
        [
          {
            type: 'platform-service-account',
            service_account_id: 'spiffe://relay-service.elastic.co',
          },
        ],
        ['relay']
      )
    ).toBe(false);
    expect(
      grantsTrustedPlatformAssumers(
        [{ type: 'platform-service-account', service_account_id: 'attacker-principal' }],
        ['relay']
      )
    ).toBe(false);
  });
});
