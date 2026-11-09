/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CASE_VIEW_CONVERSATION_ATTACHMENT_OPENED_EVENT_TYPE } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { getEbtOwner } from './get_ebt_owner';

export type ConversationOpenTarget = 'chat' | 'full_page';

/**
 * Events Based Tracking for opening an attached conversation from a case
 */
export const useConversationAttachmentOpenedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    (openTarget: ConversationOpenTarget) => {
      analytics.reportEvent(CASE_VIEW_CONVERSATION_ATTACHMENT_OPENED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        open_target: openTarget,
      });
    },
    [analytics, owner]
  );
};
