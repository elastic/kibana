/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { initPackRoutes } from '.';

const PREBUILT_PATHS = [
  '/internal/osquery/packs/_resolve_prebuilt/{assetId}',
  '/internal/osquery/packs/_prebuilt',
];

describe('initPackRoutes', () => {
  const register = (workflowsExtensionsEnabled: boolean) => {
    const router = httpServiceMock.createSetupContract().createRouter();
    initPackRoutes(router, {
      experimentalFeatures: { workflowsExtensionsEnabled },
    } as unknown as OsqueryAppContext);

    return router;
  };

  it('does not register the prebuilt pack routes when workflows extensions are off', () => {
    const router = register(false);

    for (const path of PREBUILT_PATHS) {
      expect(() => router.versioned.getRoute('get', path)).toThrow(/No routes registered/);
    }
  });

  it('registers the prebuilt pack routes when workflows extensions are on', () => {
    const router = register(true);

    for (const path of PREBUILT_PATHS) {
      expect(() => router.versioned.getRoute('get', path)).not.toThrow();
    }
  });
});
