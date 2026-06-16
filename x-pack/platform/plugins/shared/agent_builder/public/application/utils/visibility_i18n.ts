/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AgentAccessControlScope } from '@kbn/agent-builder-common';

/** Shared visibility labels for list badge and settings form. */
export const VISIBILITY_LABELS: Record<AgentAccessControlScope, string> = {
  [AgentAccessControlScope.Private]: i18n.translate(
    'xpack.agentBuilder.agents.visibility.private',
    {
      defaultMessage: 'Private',
    }
  ),
  [AgentAccessControlScope.Shared]: i18n.translate('xpack.agentBuilder.agents.visibility.shared', {
    defaultMessage: 'Shared',
  }),
  [AgentAccessControlScope.Public]: i18n.translate('xpack.agentBuilder.agents.visibility.public', {
    defaultMessage: 'Public',
  }),
};

/** Shared visibility tooltips for list badge. */
export const VISIBILITY_TOOLTIPS: Record<AgentAccessControlScope, string> = {
  [AgentAccessControlScope.Private]: i18n.translate(
    'xpack.agentBuilder.agents.visibility.privateTooltip',
    {
      defaultMessage: 'Only the owner or an administrator can view and edit.',
    }
  ),
  [AgentAccessControlScope.Shared]: i18n.translate(
    'xpack.agentBuilder.agents.visibility.sharedTooltip',
    {
      defaultMessage: 'Anyone can view. Only the owner or an administrator can edit.',
    }
  ),
  [AgentAccessControlScope.Public]: i18n.translate(
    'xpack.agentBuilder.agents.visibility.publicTooltip',
    {
      defaultMessage: 'Anyone can view and edit.',
    }
  ),
};
