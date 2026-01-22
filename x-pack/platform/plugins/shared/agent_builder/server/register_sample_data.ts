/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/core/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import { AGENTBUILDER_PATH } from '../common/features';

export function registerSampleData(home: HomeServerPluginSetup, logger: Logger) {
  const agentBuilderDataLinkLabel = i18n.translate('xpack.agentBuilder.agentBuilderDataLinkLabel', {
    defaultMessage: 'Agent Builder',
  });
  const { addAppLinksToSampleDataset } = home.sampleData;
  const sampleDataSetsId = ['ecommerce', 'flights', 'logs', 'logstsdb'];
  sampleDataSetsId.forEach((dataSetId) => {
    try {
      addAppLinksToSampleDataset(dataSetId, [
        {
          sampleObject: null,
          getPath: () => AGENTBUILDER_PATH,
          label: agentBuilderDataLinkLabel,
          icon: 'productRobot',
        },
      ]);
    } catch (error) {
      logger.warn(`Agent builder failed to register sample data links for ${dataSetId}`);
    }
  });
}
