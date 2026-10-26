/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import {
  SeverityPicker,
  type InvestigationSeverityLevel,
  type SeveritySlotRenderProps,
} from '@kbn/agentic-investigations-common';
import { useSetInvestigationSeverity } from '../../../investigations/hooks/use_investigations_api';
import { useInvestigation } from '../../../investigations/hooks/use_investigation';
import { useCanManageInvestigations } from '../../../investigations/hooks/use_can_manage_investigations';
import { investigationQueryKeys } from '../../../investigations/query_keys';

const SEVERITY_CHANGE_ERROR = i18n.translate(
  'xpack.agenticInvestigations.severityPicker.changeError',
  { defaultMessage: 'Unable to change the severity' }
);

/**
 * Wraps `SeverityPicker` with the severity mutation. Reads the severity from the polled
 * investigation, which an agent can change mid-run, falling back to the conversation's.
 */
export const ConnectedSeverityPicker: React.FC<SeveritySlotRenderProps> = ({
  conversationId,
  severity: conversationSeverity,
  refetchConversation,
}) => {
  const {
    services: { notifications },
  } = useKibana<CoreStart>();
  const queryClient = useQueryClient();
  const canManage = useCanManageInvestigations();
  const { data } = useInvestigation(conversationId);
  const { mutate, isLoading } = useSetInvestigationSeverity();

  const severity = data?.metadata.severity ?? conversationSeverity;

  const handleChange = useCallback(
    (next: InvestigationSeverityLevel) => {
      mutate(
        { investigationId: conversationId, body: { severity: next } },
        {
          onSuccess: () => {
            // Lists, counts and cards all show the severity, so every investigation read is stale.
            void queryClient.invalidateQueries({ queryKey: investigationQueryKeys.all });
            void refetchConversation?.();
          },
          onError: () => {
            notifications.toasts.addDanger(SEVERITY_CHANGE_ERROR);
          },
        }
      );
    },
    [conversationId, mutate, notifications, queryClient, refetchConversation]
  );

  return (
    <SeverityPicker
      severity={severity}
      onChange={handleChange}
      isLoading={isLoading}
      isDisabled={!canManage}
      data-test-subj="connectedSeverityPicker"
    />
  );
};
