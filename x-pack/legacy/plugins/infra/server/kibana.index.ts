/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Server } from 'hapi';
import JoiNamespace from 'joi';
import { initInfraServer } from './infra_server';
import { compose } from './lib/compose/kibana';
import { UsageCollector } from './usage/usage_collector';
import { inventoryViewSavedObjectType } from '../common/saved_objects/inventory_view';
import { metricsExplorerViewSavedObjectType } from '../common/saved_objects/metrics_explorer_view';
import { InternalCoreSetup } from '../../../../../src/core/server';
import { InfraConfig } from './new_platform_config.schema';
import { Legacy } from '../../../../../kibana';

export interface KbnServer extends Server {
  usage: any;
}

export const initServerWithKibana = (
  core: InternalCoreSetup,
  config: InfraConfig,
  kbnServer: Legacy.Server // NP_TODO: REMOVE ... temporary while shimming only
) => {
  const libs = compose(
    core,
    config,
    kbnServer // NP_TODO: REMOVE ... temporary while shimming only
  );
  initInfraServer(libs);

  // NP_TODO how do we replace this?
  kbnServer.expose(
    'defineInternalSourceConfiguration',
    libs.sources.defineInternalSourceConfiguration.bind(libs.sources)
  );

  // Register a function with server to manage the collection of usage stats
  kbnServer.usage.collectorSet.register(UsageCollector.getUsageCollector(kbnServer));

  const xpackMainPlugin = kbnServer.plugins.xpack_main;
  xpackMainPlugin.registerFeature({
    id: 'infrastructure',
    name: i18n.translate('xpack.infra.featureRegistry.linkInfrastructureTitle', {
      defaultMessage: 'Metrics',
    }),
    icon: 'infraApp',
    navLinkId: 'infra:home',
    app: ['infra', 'kibana'],
    catalogue: ['infraops'],
    privileges: {
      all: {
        api: ['infra'],
        savedObject: {
          all: [
            'infrastructure-ui-source',
            inventoryViewSavedObjectType,
            metricsExplorerViewSavedObjectType,
          ],
          read: ['index-pattern'],
        },
        ui: ['show', 'configureSource', 'save'],
      },
      read: {
        api: ['infra'],
        savedObject: {
          all: [],
          read: [
            'infrastructure-ui-source',
            'index-pattern',
            inventoryViewSavedObjectType,
            metricsExplorerViewSavedObjectType,
          ],
        },
        ui: ['show'],
      },
    },
  });

  xpackMainPlugin.registerFeature({
    id: 'logs',
    name: i18n.translate('xpack.infra.featureRegistry.linkLogsTitle', {
      defaultMessage: 'Logs',
    }),
    icon: 'loggingApp',
    navLinkId: 'infra:logs',
    app: ['infra', 'kibana'],
    catalogue: ['infralogging'],
    privileges: {
      all: {
        api: ['infra'],
        savedObject: {
          all: ['infrastructure-ui-source'],
          read: [],
        },
        ui: ['show', 'configureSource', 'save'],
      },
      read: {
        api: ['infra'],
        savedObject: {
          all: [],
          read: ['infrastructure-ui-source'],
        },
        ui: ['show'],
      },
    },
  });
};

// NP_TODO: this is only used in the root index file AFAICT, can remove after migrating to NP
export const getConfigSchema = (Joi: typeof JoiNamespace) => {
  const InfraDefaultSourceConfigSchema = Joi.object({
    metricAlias: Joi.string(),
    logAlias: Joi.string(),
    fields: Joi.object({
      container: Joi.string(),
      host: Joi.string(),
      message: Joi.array()
        .items(Joi.string())
        .single(),
      pod: Joi.string(),
      tiebreaker: Joi.string(),
      timestamp: Joi.string(),
    }),
  });

  const InfraRootConfigSchema = Joi.object({
    enabled: Joi.boolean().default(true),
    query: Joi.object({
      partitionSize: Joi.number(),
      partitionFactor: Joi.number(),
    }).default(),
    sources: Joi.object()
      .keys({
        default: InfraDefaultSourceConfigSchema,
      })
      .default(),
  }).default();

  return InfraRootConfigSchema;
};
