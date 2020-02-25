/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchMappingOf } from '../../../utils/typed_elasticsearch_mappings';
import { IRuleStatusAttributes } from './types';

export const ruleStatusSavedObjectType = 'siem-detection-engine-rule-status';

export const ruleStatusSavedObjectMappings: {
  [ruleStatusSavedObjectType]: ElasticsearchMappingOf<IRuleStatusAttributes>;
} = {
  [ruleStatusSavedObjectType]: {
    properties: {
      alertId: {
        type: 'keyword',
      },
      status: {
        type: 'keyword',
      },
      statusDate: {
        type: 'date',
      },
      lastFailureAt: {
        type: 'date',
      },
      lastSuccessAt: {
        type: 'date',
      },
      lastFailureMessage: {
        type: 'text',
      },
      lastSuccessMessage: {
        type: 'text',
      },
    },
  },
};
