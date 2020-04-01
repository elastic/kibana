/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { npSetup } from 'ui/new_platform';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { FeatureCatalogueCategory } from '../../../../../../src/plugins/home/public';
// @ts-ignore
import { PLUGIN } from '../../common/constants';

const {
  plugins: { home },
} = npSetup;

const enableLinks = Boolean(xpackInfo.get(`features.${PLUGIN.ID}.enableLinks`));

if (enableLinks) {
  home.featureCatalogue.register({
    id: 'management_logstash',
    title: i18n.translate('xpack.logstash.homeFeature.logstashPipelinesTitle', {
      defaultMessage: 'Logstash Pipelines',
    }),
    description: i18n.translate('xpack.logstash.homeFeature.logstashPipelinesDescription', {
      defaultMessage: 'Create, delete, update, and clone data ingestion pipelines.',
    }),
    icon: 'pipelineApp',
    path: '/app/kibana#/management/logstash/pipelines',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN,
  });
}
