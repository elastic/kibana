/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
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
  />
);
