/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EnrichedDeprecationInfo } from '../../../common/types';

export const DEPRECATION_TYPE_MAP: Record<EnrichedDeprecationInfo['type'], string> = {
  cluster_settings: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.clusterDeprecationTypeLabel',
    {
      defaultMessage: 'Cluster',
    }
  ),
  index_settings: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indexDeprecationTypeLabel',
    {
      defaultMessage: 'Index',
    }
  ),
  node_settings: i18n.translate('xpack.upgradeAssistant.esDeprecations.nodeDeprecationTypeLabel', {
    defaultMessage: 'Node',
  }),
  ml_settings: i18n.translate('xpack.upgradeAssistant.esDeprecations.mlDeprecationTypeLabel', {
    defaultMessage: 'Machine Learning',
  }),
  health_indicator: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.healthIndicatorTypeLabel',
    {
      defaultMessage: 'Health Indicator',
    }
  ),
  data_streams: i18n.translate('xpack.upgradeAssistant.esDeprecations.dataStreamsTypeLabel', {
    defaultMessage: 'Data Stream',
  }),
  ilm_policies: i18n.translate('xpack.upgradeAssistant.esDeprecations.ilmPoliciesTypeLabel', {
    defaultMessage: 'ILM Policy',
  }),
  templates: i18n.translate('xpack.upgradeAssistant.esDeprecations.templatesTypeLabel', {
    defaultMessage: 'Component Template',
  }),
};

export const PAGINATION_CONFIG = {
  initialPageSize: 50,
  pageSizeOptions: [50, 100, 200],
};
