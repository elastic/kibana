/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { INVESTIGATION_AGENT_ID } from '../../../../common/investigations/types';
import { investigationKeys } from '../../api/query_keys';
import { useInvestigationToasts } from '../../hooks';
import { useInvestigationsServices } from '../../services';
import { converse } from './conversation_api';
import * as i18n from './translations';

/** Sends a prompt to one conversation of the record and waits for the agent's round. */
export const useSendPrompt = (record: InvestigationRecord) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError } = useInvestigationToasts();

  return useMutation(
    ({ conversationId, input }: { conversationId: string; input: string }) =>
      converse(http, {
        agentId: record.agent_id ?? INVESTIGATION_AGENT_ID,
        conversationId,
        input,
        triggerMode: 'always',
      }),
    {
      onSuccess: () => {
        void queryClient.invalidateQueries(investigationKeys.recordScope(record.id));
      },
      onError: (error) => showError(error, i18n.SUGGESTION_ERROR),
    }
  );
};
