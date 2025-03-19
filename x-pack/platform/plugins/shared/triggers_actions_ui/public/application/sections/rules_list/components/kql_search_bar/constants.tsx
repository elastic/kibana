/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuggestionsAbstraction } from '@kbn/unified-search-plugin/public/typeahead/suggestions_component';

export const suggestionsAbstraction: SuggestionsAbstraction = {
  type: 'rules',
  fields: {
    'alert.tags': {
      field: 'alert.tags',
      fieldToQuery: 'alert.attributes.tags',
      displayField: 'tags',
    },
    'alert.name.keyword': {
      field: 'alert.name.keyword',
      fieldToQuery: 'alert.attributes.name.keyword',
      displayField: 'name',
    },
    'alert.actions.actionTypeId': {
      field: 'alert.actions.actionTypeId',
      nestedPath: 'alert.actions',
      nestedField: 'actionTypeId',
      nestedDisplayField: 'id',
      fieldToQuery: 'alert.attributes.actions',
      displayField: 'actions',
    },
    // To show multiple nested fields
    // 'alert.actions.group': {
    //   field: 'alert.actions.group',
    //   nestedPath: 'alert.actions',
    //   nestedField: 'group',
    //   nestedDisplayField: 'group',
    //   fieldToQuery: 'alert.attributes.actions',
    //   displayField: 'actions',
    // },
    'alert.alertTypeId': {
      field: 'alert.alertTypeId',
      fieldToQuery: 'alert.attributes.alertTypeId',
      displayField: 'type',
    },
    'alert.lastRun.outcome': {
      field: 'alert.lastRun.outcome',
      fieldToQuery: 'alert.attributes.lastRun.outcome',
      displayField: 'lastResponse',
    },
    'alert.enabled': {
      field: 'alert.enabled',
      fieldToQuery: 'alert.attributes.enabled',
      displayField: 'enabled',
    },
    'alert.muteAll': {
      field: 'alert.muteAll',
      fieldToQuery: 'alert.attributes.muteAll',
      displayField: 'muted',
    },
    'alert.params.threat.tactic.name': {
      field: 'alert.params.threat.tactic.name',
      fieldToQuery: 'alert.attributes.params.threat.tactic.name',
      displayField: 'threat.tactic.name',
    },
    'alert.params.threat.technique.name': {
      field: 'alert.params.threat.technique.name',
      fieldToQuery: 'alert.attributes.params.threat.technique.name',
      displayField: 'threat.technique.name',
    },
  },
};
