/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import {
  CREATE_WITH_AGENT_INITIAL_PROMPT,
  AGENT_BUILDER_NEW_CONVERSATION_PATH,
} from '../constants';

export const useNavigateToAgentBuilder = () => {
  const { navigateToApp } = useService(CoreStart('application'));

  return useCallback(() => {
    navigateToApp(AGENT_BUILDER_APP_ID, {
      path: AGENT_BUILDER_NEW_CONVERSATION_PATH,
      state: { initialMessage: CREATE_WITH_AGENT_INITIAL_PROMPT },
    });
  }, [navigateToApp]);
};
