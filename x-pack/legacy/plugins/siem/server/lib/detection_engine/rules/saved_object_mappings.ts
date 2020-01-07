/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchMappingOf } from '../../../utils/typed_elasticsearch_mappings';
import { RuleStatus } from './types';

export const ruleStatusSavedObjectType = 'siem-detection-engine-rule-status';

export const ruleStatusSavedObjectMappings: {
  [ruleStatusSavedObjectType]: ElasticsearchMappingOf<RuleStatus>;
} = {
  [ruleStatusSavedObjectType]: {
    properties: {
      alertId: {
        type: 'text',
      },
      status: {
        type: 'keyword',
      },
      statusDate: {
        type: 'keyword', // TODO: CHANGE THIS TO DATE LATER
      },
      lastFailureAt: {
        type: 'keyword', // TODO: CHANGE THIS TO DATE LATER
      },
      lastSuccessAt: {
        type: 'keyword', // TODO: CHANGE THIS TO DATE LATER
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
