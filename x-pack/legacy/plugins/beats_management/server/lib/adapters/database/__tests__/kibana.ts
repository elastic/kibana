/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// file.skip

// @ts-ignore
import { createLegacyEsTestCluster } from '@kbn/test';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Root } from 'src/core/server/root';
// @ts-ignore
import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
import { DatabaseKbnESPlugin } from '../adapter_types';
import { KibanaDatabaseAdapter } from '../kibana_database_adapter';
import { contractTests } from './test_contract';
const es = createLegacyEsTestCluster({});

let legacyServer: any;
let rootServer: Root;
contractTests('Kibana Database Adapter', {
  before: async () => {
    await es.start();

    rootServer = kbnTestServer.createRootWithCorePlugins({
      server: { maxPayloadBytes: 100 },
    });

    await rootServer.setup();
    legacyServer = kbnTestServer.getKbnServer(rootServer);
    return await legacyServer.plugins.elasticsearch.waitUntilReady();
  },
  after: async () => {
    await rootServer.shutdown();
    return await es.cleanup();
  },
  adapterSetup: () => {
    return new KibanaDatabaseAdapter(legacyServer.plugins.elasticsearch as DatabaseKbnESPlugin);
  },
});
