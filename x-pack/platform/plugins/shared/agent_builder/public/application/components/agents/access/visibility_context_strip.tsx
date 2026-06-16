/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { AgentAccessControlScope, type AgentDefinition } from '@kbn/agent-builder-common';
import { VISIBILITY_LABELS } from '../../../utils/visibility_i18n';
import { visibilityContextMessage } from './access_i18n';

interface VisibilityContextStripProps {
  agent: AgentDefinition;
}

export const VisibilityContextStrip: React.FC<VisibilityContextStripProps> = ({ agent }) => {
  const visibility = agent.accessControl?.scope ?? AgentAccessControlScope.Public;
  const label = VISIBILITY_LABELS[visibility];
  const messages = visibilityContextMessage(label);

  let title: string;
  switch (visibility) {
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
