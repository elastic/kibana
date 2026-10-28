/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentPolicyRouteService,
  agentRouteService,
  agentlessPolicyRouteService,
  enrollmentAPIKeyRouteService,
  epmRouteService,
  buildPath,
  outputRoutesService,
  packagePolicyRouteService,
} from './routes';

const TRAVERSAL_PAYLOADS = [
  '../../../../api/spaces/space/default',
  '..',
  '.',
  'id/../../other',
  'id?query=1',
  'id#fragment',
  'id\\..\\other',
  'id%2f..%2fother',
];

describe('buildPath', () => {
  it('leaves regular values unchanged', () => {
    expect(buildPath('/api/fleet/things/{id}', { id: 'my-policy_1.0.0' })).toBe(
      '/api/fleet/things/my-policy_1.0.0'
    );
  });

  it.each(TRAVERSAL_PAYLOADS)('produces a single safe path segment for %s', (payload) => {
    const path = buildPath('/api/fleet/things/{id}', { id: payload });
    const rest = path.slice('/api/fleet/things/'.length);
    expect(rest).not.toMatch(/[/\\?#]/);
    expect(rest).not.toMatch(/^(\.|%2e){1,2}$/i);
    expect(new URL(path, 'http://localhost').pathname).toBe(`/api/fleet/things/${rest}`);
  });
});

describe('route services', () => {
  const builders: Array<[string, (id: string) => string, string]> = [
    ['packagePolicy info', packagePolicyRouteService.getInfoPath, '/api/fleet/package_policies/'],
    [
      'packagePolicy update',
      packagePolicyRouteService.getUpdatePath,
      '/api/fleet/package_policies/',
    ],
    ['agentPolicy info', agentPolicyRouteService.getInfoPath, '/api/fleet/agent_policies/'],
    ['agentPolicy update', agentPolicyRouteService.getUpdatePath, '/api/fleet/agent_policies/'],
    [
      'agentless delete',
      agentlessPolicyRouteService.getDeletePath,
      '/api/fleet/agentless_policies/',
    ],
    ['agent unenroll', (id) => agentRouteService.getUnenrollPath(id), '/api/fleet/agents/'],
    ['output delete', outputRoutesService.getDeletePath, '/api/fleet/outputs/'],
    [
      'enrollment key delete',
      enrollmentAPIKeyRouteService.getDeletePath,
      '/api/fleet/enrollment_api_keys/',
    ],
  ];

  describe.each(builders)('%s', (_name, build, prefix) => {
    it.each(TRAVERSAL_PAYLOADS)('keeps %s inside a single path segment', (payload) => {
      const path = build(payload);
      expect(path.startsWith(prefix)).toBe(true);
      const rest = path.slice(prefix.length);
      expect(rest).not.toMatch(/[?#\\]/);
      expect(rest.split('/').some((segment) => /^(\.|%2e){1,2}$/i.test(segment))).toBe(false);
      expect(new URL(path, 'http://localhost').pathname.startsWith(prefix)).toBe(true);
    });
  });

  it('encodes package name and version', () => {
    const path = epmRouteService.getInfoPath('../../x', '1.0.0/../..');
    expect(new URL(path, 'http://localhost').pathname.startsWith('/api/fleet/epm/packages/')).toBe(
      true
    );
    expect(path).not.toContain('/../');
  });

  it('keeps legitimate package paths unchanged', () => {
    expect(epmRouteService.getInfoPath('nginx', '1.2.3-preview1')).toBe(
      '/api/fleet/epm/packages/nginx/1.2.3-preview1'
    );
    expect(epmRouteService.getFilePath('/package/nginx/1.2.3/img/logo.svg')).toBe(
      '/api/fleet/epm/packages/nginx/1.2.3/img/logo.svg'
    );
  });
});
