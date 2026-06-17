/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AgentAccessControlScope } from '@kbn/agent-builder-common';

/** Shared access control scope labels for list badge and settings form. */
export const ACCESS_CONTROL_SCOPE_LABELS: Record<AgentAccessControlScope, string> = {
  [AgentAccessControlScope.Private]: i18n.translate(
    'xpack.agentBuilder.agents.accessControlScope.private',
    {
      defaultMessage: 'Private',
    }
  ),
  [AgentAccessControlScope.Shared]: i18n.translate(
    'xpack.agentBuilder.agents.accessControlScope.shared',
    {
      defaultMessage: 'Shared',
    }
  ),
  [AgentAccessControlScope.Public]: i18n.translate(
    'xpack.agentBuilder.agents.accessControlScope.public',
    {
      defaultMessage: 'Public',
    }
  ),
};

/** Shared access control scope tooltips for list badge. */
export const ACCESS_CONTROL_SCOPE_TOOLTIPS: Record<AgentAccessControlScope, string> = {
  [AgentAccessControlScope.Private]: i18n.translate(
    'xpack.agentBuilder.agents.accessControlScope.privateTooltip',
    {
      defaultMessage: 'Only the owner or an administrator can view and edit.',
    }
  ),
  [AgentAccessControlScope.Shared]: i18n.translate(
    'xpack.agentBuilder.agents.accessControlScope.sharedTooltip',
    {
      defaultMessage: 'Anyone can view. Only the owner or an administrator can edit.',
    }
  ),
  [AgentAccessControlScope.Public]: i18n.translate(
    'xpack.agentBuilder.agents.accessControlScope.publicTooltip',
    {
      defaultMessage: 'Anyone can view and edit.',
    }
  ),
};
