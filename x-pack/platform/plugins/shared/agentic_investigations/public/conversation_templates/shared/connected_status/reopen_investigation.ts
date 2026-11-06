/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { QueryClient } from '@kbn/react-query';
import type { Investigation } from '@kbn/agentic-investigations-common';
import { AGENTIC_INVESTIGATIONS_API_VERSION, INVESTIGATION_STATUS_URL } from '../../../../common';
import { escalationQueryKeys } from '../../../escalations/query_keys';
import * as i18n from '../close_confirmation/translations';

/**
 * Reopens a closed investigation with no confirmation (unlike close, it dismisses nothing).
 * Used by the investigation details flyout Actions menu.
 */
export const reopenInvestigation = async ({
  investigation,
  http,
  notifications,
  queryClient,
}: {
  investigation: Investigation;
  http: HttpStart;
  notifications?: NotificationsStart;
  queryClient: QueryClient;
}): Promise<void> => {
  const investigationId = investigation.conversationId ?? investigation.id;
  try {
    await http.put(INVESTIGATION_STATUS_URL.replace('{id}', encodeURIComponent(investigationId)), {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
      body: JSON.stringify({ status: 'open' }),
    });
    notifications?.toasts.addSuccess(i18n.REOPEN_INVESTIGATION_SUCCESS);
    void queryClient.invalidateQueries({ queryKey: escalationQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['nightshift.investigations'] });
  } catch {
    notifications?.toasts.addDanger(i18n.STATUS_CHANGE_ERROR);
  }
};
