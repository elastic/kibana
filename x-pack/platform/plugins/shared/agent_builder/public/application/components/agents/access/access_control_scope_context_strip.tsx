/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { AgentAccessControlScope, type AgentDefinition } from '@kbn/agent-builder-common';
import { ACCESS_CONTROL_SCOPE_LABELS } from '../../../utils/access_control_scope_i18n';
import { accessControlScopeContextMessage } from './access_i18n';

interface AccessControlScopeContextStripProps {
  agent: AgentDefinition;
}

export const AccessControlScopeContextStrip: React.FC<AccessControlScopeContextStripProps> = ({
  agent,
}) => {
  const accessControlScope = agent.access_control?.scope ?? AgentAccessControlScope.Public;
  const label = ACCESS_CONTROL_SCOPE_LABELS[accessControlScope];
  const messages = accessControlScopeContextMessage(label);

  let title: string;
  switch (accessControlScope) {
    case AgentAccessControlScope.Private:
      title = messages.privateMessage;
      break;
    case AgentAccessControlScope.Shared:
      title = messages.sharedMessage;
      break;
    case AgentAccessControlScope.Public:
    default:
      title = messages.publicMessage;
      break;
  }

  return (
    <EuiCallOut
      color="primary"
      size="s"
      title={title}
      data-test-subj="agentBuilderAclContextStrip"
    />
  );
};
