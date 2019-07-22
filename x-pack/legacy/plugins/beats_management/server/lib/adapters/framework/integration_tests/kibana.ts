/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// file.skip

import { camelCase } from 'lodash';
// @ts-ignore
import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
// @ts-ignore
import { TestKbnServerConfig } from '../../../../../../../test_utils/kbn_server_config';
import { CONFIG_PREFIX } from '../../../../../common/constants/plugin';
import { PLUGIN } from './../../../../../common/constants/plugin';
import { KibanaBackendFrameworkAdapter } from './../kibana_framework_adapter';
import { contractTests } from './test_contract';

let kbnServer: any;
let kbn: any;
let esServer: any;
contractTests('Kibana  Framework Adapter', {
  async before() {
    const servers = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: TestKbnServerConfig,
    });
    esServer = await servers.startES();
    kbn = await servers.startKibana();
    kbnServer = kbn.kbnServer;
  },
  async after() {
    await kbn.stop();
    await esServer.stop();
  },
  adapterSetup: () => {
    return new KibanaBackendFrameworkAdapter(camelCase(PLUGIN.ID), kbnServer.server, CONFIG_PREFIX);
  },
});
