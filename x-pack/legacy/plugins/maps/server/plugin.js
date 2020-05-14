/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { APP_ID } from '../../../../plugins/maps/common/constants';

export class MapPlugin {
  setup(__LEGACY) {
    __LEGACY.injectUiAppVars(APP_ID, async () => {
      return await __LEGACY.getInjectedUiAppVars('kibana');
    });
  }
}
