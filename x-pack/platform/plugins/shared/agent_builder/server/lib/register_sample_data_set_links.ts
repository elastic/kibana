/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/core/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import { AGENTBUILDER_PATH } from '../../common/features';

export function registerSampleDataSetLinks(home: HomeServerPluginSetup, logger: Logger) {
  const sampleDataLinkLabel = i18n.translate('xpack.ml.sampleDataLinkLabel', {
    defaultMessage: 'Agent Builder',
  });
  const { addAppLinksToSampleDataset } = home.sampleData;

  try {
    addAppLinksToSampleDataset('ecommerce', [
      {
        sampleObject: {
          type: 'index-pattern',
          id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        },
        getPath: () => AGENTBUILDER_PATH,
        label: sampleDataLinkLabel,
        icon: 'productRobot',
      },
    ]);
  } catch (error) {
    logger.warn(`Agent builder failed to register sample data links for ecommerce`);
  }
  try {
    addAppLinksToSampleDataset('flights', [
      {
        sampleObject: {
          type: 'index-pattern',
          id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        },
        getPath: () => AGENTBUILDER_PATH,
        label: sampleDataLinkLabel,
        icon: 'productRobot',
      },
    ]);
  } catch (error) {
    logger.warn(`Agent Builder failed to register sample data links for flights`);
  }
  try {
    addAppLinksToSampleDataset('logs', [
      {
        sampleObject: {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        },
        getPath: () => AGENTBUILDER_PATH,
        label: sampleDataLinkLabel,
        icon: 'productRobot',
      },
    ]);
  } catch (error) {
    logger.warn(`Agent Builder failed to register sample data links for logs`);
  }

  // try {
  //   addAppLinksToSampleDataset('logstsdb', [
  //     {
  //       sampleObject: {
  //         type: 'index-pattern',
  //         id: '90943e30-9a47-11e8-b64d-95841ca0c247',
  //       },
  //       getPath: () => AGENTBUILDER_PATH,
  //       label: sampleDataLinkLabel,
  //       icon: 'productRobot',
  //     },
  //   ]);
  // } catch (error) {
  //   logger.warn(`Agent Builder failed to register sample data links for Sample web logs (TSDB)`);
  // }
}
