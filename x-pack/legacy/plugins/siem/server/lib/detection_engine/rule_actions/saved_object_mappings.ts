/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ruleActionsSavedObjectType = 'siem-detection-engine-rule-actions';

export const ruleActionsSavedObjectMappings = {
  [ruleActionsSavedObjectType]: {
    properties: {
      alertThrottle: {
        type: 'keyword',
      },
      ruleAlertId: {
        type: 'keyword',
      },
      ruleThrottle: {
        type: 'keyword',
      },
      actions: {
        properties: {
          group: {
            type: 'keyword',
          },
          id: {
            type: 'keyword',
          },
          action_type_id: {
            type: 'keyword',
          },
          params: {
            type: 'object',
            enabled: false,
          },
        },
      },
    },
  },
};
