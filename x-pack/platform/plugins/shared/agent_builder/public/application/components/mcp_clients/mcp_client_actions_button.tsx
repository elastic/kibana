/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';
import { i18n } from '@kbn/i18n';

export interface McpClientActionsMenuProps {
  clientId: string;
}

// TODO: Implement as part of "[Agent Builder] OAuth Client registration and management flows"
export const McpClientActionsMenu = ({ clientId }: McpClientActionsMenuProps) => (
  <EuiButtonIcon
    iconType="boxesVertical"
    color="text"
    isDisabled
    aria-label={i18n.translate('xpack.agentBuilder.mcpClients.actions.ariaLabel', {
      defaultMessage: 'Actions',
    })}
    data-test-subj={`agentBuilderMcpClientsListActions-${clientId}`}
    data-ebt-element={AGENT_BUILDER_UI_EBT.element.MANAGE_MCP_CLIENTS_TABLE}
    data-ebt-action={AGENT_BUILDER_UI_EBT.action.manageTools.MCP_CLIENTS_TABLE_ACTIONS_OPEN}
  />
);
