/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PIPELINE_LIST = {
  INITIAL_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [5, 8, 20, 50],
  PIPELINE_NOT_CENTRALLY_MANAGED_TOOLTIP_TEXT: i18n.translate(
    'xpack.logstash.pipelineNotCentrallyManagedTooltip',
    {
      defaultMessage: `This pipeline wasn't created using Centralized Configuration Management. It can't be managed or edited here.`,
    }
  ),
  INFO_ALERTS: {
    CALL_OUT_TITLE: i18n.translate('xpack.logstash.kibanaManagementPipelinesTitle', {
      defaultMessage: 'Only pipelines created in Kibana Management appear here',
    }),
  },
};
