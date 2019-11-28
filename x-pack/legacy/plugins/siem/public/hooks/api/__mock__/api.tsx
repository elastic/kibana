/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternSavedObject } from '../../types';

export const mockIndexPatternSavedObjects: IndexPatternSavedObject[] = [
  {
    type: 'index-pattern',
    id: '2d1fe420-eeee-11e9-ad95-4b5e687c2aee',
    attributes: {
      title: 'filebeat-*',
    },
    updated_at: '2019-08-26T04:30:09.111Z',
    version: 'WzE4LLwxXQ==',
  },
  {
    type: 'index-pattern',
    id: '5463ec70-c7ba-ffff-ad95-4b5e687c2aee',
    attributes: {
      title: 'auditbeat-*',
    },
    updated_at: '2019-08-26T04:31:12.934Z',
    version: 'WzELLywxXQ==',
  },
];
