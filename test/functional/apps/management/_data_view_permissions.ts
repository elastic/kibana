/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');

  describe('Data view permissions', function () {
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});

      await security.role.create('data_viewz', {
        metadata: {},
        elasticsearch: {
          cluster: [],
          indices: [],
        },
        kibana: [
          {
            base: ['all'],
            feature: {
              // indexPatterns: ['read'],
            },
            spaces: ['*'],
          },
        ],
      });

      await security.testUser.setRoles(['data_viewz']);
    });

    describe('data view role permissions', () => {
      it('prevent creation', async () => {});
      it('prevent editing', async () => {});
      it('prevent deletion', async () => {});
    });
    after(async function () {
      await security.testUser.restoreDefaults();
    });
  });
}
