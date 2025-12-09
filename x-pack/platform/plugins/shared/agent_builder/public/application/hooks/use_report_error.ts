/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';
import { eventTypes } from '../../../common/events';

const useReportEvent = () => {
  const {
    services: { analytics },
  } = useKibana();

  return {
    reportEvent: ({
      eventType,
      eventData,
    }: {
      eventType: string;
      eventData: Record<string, unknown>;
    }) => {
      try {
        analytics.reportEvent(eventType, eventData);
      } catch {
        // Discard analytics errors
      }
    },
  };
};

export const useReportConverseError = () => {
  const { reportEvent } = useReportEvent();

  return {
    reportConverseError: (
      error: unknown,
      {
        conversationId,
        agentId,
        connectorId,
      }: { conversationId?: string; agentId?: string; connectorId?: string }
    ) => {
      reportEvent({
        eventType: eventTypes.AGENTBUILDER_CONVERSE_ERROR,
        eventData: {
          error_type: error?.constructor?.name || 'unknown',
          error_message: error instanceof Error ? error.message : String(error),
          error_stack: error instanceof Error ? error.stack : undefined,
          conversation_id: conversationId,
          agent_id: agentId,
          connector_id: connectorId,
        },
      });
    },
  };
};
