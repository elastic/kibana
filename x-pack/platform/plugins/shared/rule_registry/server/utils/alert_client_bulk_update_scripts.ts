/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
} from '../../common/technical_rule_data_field_names';

export const getStatusUpdateScript = (status: string) => {
  return `
          if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
            ctx._source['${ALERT_WORKFLOW_STATUS}'] = '${status}';
          }
          if (ctx._source.signal != null && ctx._source.signal.status != null) {
            ctx._source.signal.status = '${status}';
          }
        `;
};

export const ADD_TAGS_UPDATE_SCRIPT = `
        if (ctx._source['${ALERT_WORKFLOW_TAGS}'] == null) {
          ctx._source['${ALERT_WORKFLOW_TAGS}'] = new ArrayList();
        }
        for (item in params.addTags) {
          if (!ctx._source['${ALERT_WORKFLOW_TAGS}'].contains(item)) {
            ctx._source['${ALERT_WORKFLOW_TAGS}'].add(item);
          }
        }
      `;

export const REMOVE_TAGS_UPDATE_SCRIPT = `
        if (ctx._source['${ALERT_WORKFLOW_TAGS}'] != null) {
          for (int i = 0; i < params.removeTags.length; i++) {
            if (ctx._source['${ALERT_WORKFLOW_TAGS}'].contains(params.removeTags[i])) {
              int index = ctx._source['${ALERT_WORKFLOW_TAGS}'].indexOf(params.removeTags[i]);
              ctx._source['${ALERT_WORKFLOW_TAGS}'].remove(index);
            }
          }
        }
      `;
