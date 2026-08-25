/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup, HttpStart } from '@kbn/core/public';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { conversationListStepCommonDefinition } from '../../common/step_types/conversation_list';
import { createAgentIdSelectionHandler } from './agent_id_selection';

export const createConversationListStepDefinition = (core: CoreSetup) => {
  let httpPromise: Promise<HttpStart> | null = null;

  const getHttp = async (): Promise<HttpStart> => {
    if (!httpPromise) {
      httpPromise = core.getStartServices().then(([coreStart]) => coreStart.http);
    }
    return httpPromise;
  };

  return createPublicStepDefinition({
    ...conversationListStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/comment').then(({ icon }) => ({
        default: icon,
      }))
    ),
    editorHandlers: {
      input: {
        agent_id: {
          selection: createAgentIdSelectionHandler(getHttp),
        },
      },
    },
  });
};
