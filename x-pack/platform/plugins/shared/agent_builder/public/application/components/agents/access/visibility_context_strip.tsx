/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { AgentVisibility, type AgentDefinition } from '@kbn/agent-builder-common';
import { VISIBILITY_LABELS } from '../../../utils/visibility_i18n';
import { visibilityContextMessage } from './access_i18n';

interface VisibilityContextStripProps {
  agent: AgentDefinition;
}

export const VisibilityContextStrip: React.FC<VisibilityContextStripProps> = ({ agent }) => {
  const visibility = agent.visibility ?? AgentVisibility.Public;
  const label = VISIBILITY_LABELS[visibility];
  const messages = visibilityContextMessage(label);

  let title: string;
  switch (visibility) {
    case AgentVisibility.Private:
      title = messages.privateMessage;
      break;
    case AgentVisibility.Shared:
      title = messages.sharedMessage;
      break;
    case AgentVisibility.Public:
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
