/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthzDisabled } from '@kbn/core-security-server';
import { catalogRouteSecurity, routeSecurityForAuthz } from './route_security';

describe('routeSecurityForAuthz', () => {
  it('requires the APM feature for the apm class', () => {
    expect(routeSecurityForAuthz('apm')).toEqual({ authz: { requiredPrivileges: ['apm'] } });
  });

  it('requires APM and the ML jobs privilege for the apm_ml class', () => {
    expect(routeSecurityForAuthz('apm_ml')).toEqual({
      authz: { requiredPrivileges: ['apm', 'ml:canGetJobs'] },
    });
  });

  it('opts the catalog out because it returns metadata and does not query Elasticsearch', () => {
    expect(catalogRouteSecurity()).toEqual({
      authz: {
        enabled: false,
        reason:
          'This route returns analyzer ids and display names only. Each analysis route enforces its own access.',
      },
    });
  });

  it('opts the es_delegated class out because Elasticsearch checks the index', () => {
    expect(routeSecurityForAuthz('es_delegated')).toEqual({
      authz: AuthzDisabled.delegateToESClient,
    });
  });
});
