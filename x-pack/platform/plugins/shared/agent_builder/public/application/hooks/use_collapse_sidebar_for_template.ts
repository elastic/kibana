/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { searchParamNames } from '../search_param_names';
import { useConversation } from './use_conversation';

/**
 * Collapses the conversation list when a conversation that follows a template, such as an
 * investigation, is opened: its details need the room. It asks once per conversation through the
 * layout's `sidebarCollapsed` hint, so a person who expands the list again keeps it open.
 */
export const useCollapseSidebarForTemplate = (): void => {
  const history = useHistory();
  const { conversation } = useConversation();
  const conversationId = conversation?.id;
  const hasTemplate = Boolean(conversation?.template_id);
  const collapsedFor = useRef<string>();

  useEffect(() => {
    if (!hasTemplate || !conversationId || collapsedFor.current === conversationId) {
      return;
    }
    collapsedFor.current = conversationId;
    const { location } = history;
    const params = new URLSearchParams(location.search);
    params.set(searchParamNames.sidebarCollapsed, 'true');
    history.replace({ ...location, search: params.toString() });
  }, [history, hasTemplate, conversationId]);
};
