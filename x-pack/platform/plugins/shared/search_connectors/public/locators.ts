/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';

import { PLUGIN_ID } from '../common/constants';
import { CONNECTORS_PATH, ROOT_PATH } from './components/routes';

export function registerLocators(share: SharePluginSetup) {
  share.url.locators.create<SerializableRecord>(new ConnectorsEndpointLocatorDefinition());
}

class ConnectorsEndpointLocatorDefinition implements LocatorDefinition<SerializableRecord> {
  public readonly getLocation = async () => {
    return {
      app: PLUGIN_ID,
      path: ROOT_PATH,
      state: {},
    };
  };

  public readonly id = 'CONNECTORS_ENDPOINTS';
}
