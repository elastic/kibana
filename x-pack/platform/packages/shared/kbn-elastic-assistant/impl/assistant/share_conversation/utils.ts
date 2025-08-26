/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationSharedState } from '@kbn/elastic-assistant-common';

export const getSharedIcon = (sharedState: ConversationSharedState): string => {
  switch (sharedState) {
    case ConversationSharedState.SHARED:
      return 'globe';
    case ConversationSharedState.RESTRICTED:
      return 'users';
    case ConversationSharedState.PRIVATE:
      return 'lock';
    default:
      return 'lock';
  }
};
