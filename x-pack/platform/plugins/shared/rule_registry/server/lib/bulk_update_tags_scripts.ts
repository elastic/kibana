/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_WORKFLOW_TAGS } from '../../common/technical_rule_data_field_names';

export const ADD_TAGS_UPDATE_SCRIPT = `
  if (ctx._source['${ALERT_WORKFLOW_TAGS}'] == null) {
    ctx._source['${ALERT_WORKFLOW_TAGS}'] = new ArrayList();
  }
  for (item in params.add) {
    if (!ctx._source['${ALERT_WORKFLOW_TAGS}'].contains(item.trim())) {
      ctx._source['${ALERT_WORKFLOW_TAGS}'].add(item.trim());
    }
  }
`;

export const REMOVE_TAGS_UPDATE_SCRIPT = `
  if (ctx._source['${ALERT_WORKFLOW_TAGS}'] != null) {
    for (int i = 0; i < params.remove.length; i++) {
      if (ctx._source['${ALERT_WORKFLOW_TAGS}'].contains(params.remove[i].trim())) {
        int index = ctx._source['${ALERT_WORKFLOW_TAGS}'].indexOf(params.remove[i].trim());
        ctx._source['${ALERT_WORKFLOW_TAGS}'].remove(index);
      }
    }
  }
`;

export const getBulkUpdateTagsPainlessScript = (
  add?: string[] | null,
  remove?: string[] | null
) => {
  const scriptOps: string[] = [];
  const params: Record<string, string[]> = {};

  if (add != null && add.length > 0) {
    params.add = add;
    scriptOps.push(ADD_TAGS_UPDATE_SCRIPT);
  }

  if (remove != null && remove.length > 0) {
    params.remove = remove;
    scriptOps.push(REMOVE_TAGS_UPDATE_SCRIPT);
  }

  return {
    source: scriptOps.join('\n'),
    lang: 'painless',
    params: Object.keys(params).length > 0 ? params : undefined,
  };
};
