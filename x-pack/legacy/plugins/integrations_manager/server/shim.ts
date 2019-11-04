/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { BehaviorSubject } from 'rxjs';
import { PLUGIN } from '../common/constants';
import { EPMCoreSetup, EPMPluginInitializerContext, PluginsSetup } from './plugin';

// yes, any. See https://github.com/elastic/kibana/blob/master/x-pack/legacy/plugins/infra/server/lib/adapters/configuration/kibana_configuration_adapter.ts#L49-L58
// for a way around it, but this is Legacy Platform and I'm not sure these hoops are worth jumping through.
export const createSetupShim = (server: any) => {
  const newPlatform: Legacy.Server['newPlatform'] = server.newPlatform;
  const npSetup = newPlatform.setup;
  const getConfig$ = () =>
    new BehaviorSubject(server.config().get(PLUGIN.CONFIG_PREFIX)).asObservable();

  const initializerContext: EPMPluginInitializerContext = {
    config: {
      create: getConfig$,
      createIfExists: getConfig$,
    },
  };

  const coreSetup: EPMCoreSetup = {
    elasticsearch: npSetup.core.elasticsearch,
    hapiServer: newPlatform.__internals.hapiServer,
  };

  const pluginsSetup = {
    // @ts-ignore: New Platform not typed
    features: npSetup.plugins.features as PluginsSetup['features'],
  };

  return {
    initializerContext,
    coreSetup,
    pluginsSetup,
  };
};
