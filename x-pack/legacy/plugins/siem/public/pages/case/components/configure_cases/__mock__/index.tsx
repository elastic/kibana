/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Connector } from '../../../../../containers/case/configure/types';

export const connectors: Connector[] = [
  {
    id: '123',
    actionTypeId: '.servicenow',
    name: 'My Connector',
    config: {
      apiUrl: 'https://instance1.service-now.com',
      casesConfiguration: {
        mapping: [
          {
            source: 'title',
            target: 'short_description',
            actionType: 'overwrite',
          },
          {
            source: 'description',
            target: 'description',
            actionType: 'append',
          },
          {
            source: 'comments',
            target: 'comments',
            actionType: 'append',
          },
        ],
      },
    },
  },
  {
    id: '456',
    actionTypeId: '.servicenow',
    name: 'My Connector 2',
    config: {
      apiUrl: 'https://instance2.service-now.com',
      casesConfiguration: {
        mapping: [
          {
            source: 'title',
            target: 'short_description',
            actionType: 'overwrite',
          },
          {
            source: 'description',
            target: 'description',
            actionType: 'overwrite',
          },
          {
            source: 'comments',
            target: 'comments',
            actionType: 'append',
          },
        ],
      },
    },
  },
];
