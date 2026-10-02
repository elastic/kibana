/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_ACTION_POLICY_INSTALL_SAMPLES_API_PATH } from '../constants';
import { InstallActionPolicySamplesRoute } from './install_action_policy_samples_route';

describe('InstallActionPolicySamplesRoute', () => {
  it('is an internal POST route', () => {
    expect(InstallActionPolicySamplesRoute.method).toBe('post');
    expect(InstallActionPolicySamplesRoute.path).toBe(
      ALERTING_V2_ACTION_POLICY_INSTALL_SAMPLES_API_PATH
    );
    expect(InstallActionPolicySamplesRoute.routeOptions.access).toBe('internal');
  });

  it('requires write access to action policies and create and read access to workflows', () => {
    const security = InstallActionPolicySamplesRoute.security;
    const requiredPrivileges =
      security && 'authz' in security && 'requiredPrivileges' in security.authz
        ? security.authz.requiredPrivileges
        : [];

    expect(requiredPrivileges).toEqual(
      expect.arrayContaining([
        ALERTING_V2_API_PRIVILEGES.actionPolicies.write,
        ...WorkflowsManagementOperationPrivileges.create,
        ...WorkflowsManagementOperationPrivileges.read,
      ])
    );
  });
});
