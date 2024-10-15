/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqueId } from 'lodash';
import { buildConversation } from '../../utils/builders';

export function useConversations() {
  return [
    buildConversation({
      conversation: {
        id: uniqueId(),
        title: 'Investigation into Cart service degradation',
        last_updated: '',
      },
    }),
    buildConversation({
      conversation: {
        id: uniqueId(),
        title: 'Why is database service responding with errors after I did rm -rf /postgres',
        last_updated: '',
      },
    }),
    buildConversation({
      conversation: {
        id: uniqueId(),
        title: 'Why is database service responding with errors after I did rm -rf /postgres',
        last_updated: '',
      },
    }),
    buildConversation({
      conversation: {
        id: uniqueId(),
        title: 'Why is database service responding with errors after I did rm -rf /postgres',
        last_updated: '',
      },
    }),
    buildConversation({
      conversation: {
        id: uniqueId(),
        title: 'Why is database service responding with errors after I did rm -rf /postgres',
        last_updated: '',
      },
    }),
    buildConversation({
      conversation: {
        id: uniqueId(),
        title: 'Why is database service responding with errors after I did rm -rf /postgres',
        last_updated: '',
      },
    }),
    buildConversation({
      conversation: {
        id: uniqueId(),
        title: 'Why is database service responding with errors after I did rm -rf /postgres',
        last_updated: '',
      },
    }),
  ];
}
