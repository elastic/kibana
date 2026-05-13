/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AgentAclRole, AgentVisibility } from '@kbn/agent-builder-common';

export interface AgentAclCapabilities {
  see: boolean;
  use: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

/**
 * Internal capability set granted by each ACL role.
 *
 * These are the user-visible labels of the discrete permissions the plan describes
 * (see/list/use/read/update/delete). The hierarchical role enum is the source of truth
 * server-side; this map exists to render UI tooltips and explanatory copy.
 */
export const ROLE_CAPABILITIES: Record<AgentAclRole, AgentAclCapabilities> = {
  [AgentAclRole.User]: {
    see: true,
    use: true,
    read: true,
    update: false,
    delete: false,
  },
  [AgentAclRole.Editor]: {
    see: true,
    use: true,
    read: true,
    update: true,
    delete: false,
  },
  [AgentAclRole.Manager]: {
    see: true,
    use: true,
    read: true,
    update: true,
    delete: true,
  },
};

export const ROLE_LABEL: Record<AgentAclRole, string> = {
  [AgentAclRole.User]: i18n.translate('xpack.agentBuilder.acl.role.user.label', {
    defaultMessage: 'User',
  }),
  [AgentAclRole.Editor]: i18n.translate('xpack.agentBuilder.acl.role.editor.label', {
    defaultMessage: 'Editor',
  }),
  [AgentAclRole.Manager]: i18n.translate('xpack.agentBuilder.acl.role.manager.label', {
    defaultMessage: 'Manager',
  }),
};

export const ROLE_DESCRIPTION: Record<AgentAclRole, string> = {
  [AgentAclRole.User]: i18n.translate('xpack.agentBuilder.acl.role.user.description', {
    defaultMessage: 'Can find, view, and run this agent.',
  }),
  [AgentAclRole.Editor]: i18n.translate('xpack.agentBuilder.acl.role.editor.description', {
    defaultMessage: 'User + edit configuration.',
  }),
  [AgentAclRole.Manager]: i18n.translate('xpack.agentBuilder.acl.role.manager.description', {
    defaultMessage: 'Editor + delete and manage access.',
  }),
};

const ROLE_ORDER: AgentAclRole[] = [
  AgentAclRole.User,
  AgentAclRole.Editor,
  AgentAclRole.Manager,
];

/**
 * Roles that meaningfully grant something on top of a given visibility.
 *
 * For Public/Shared agents the see/use baseline is already global, so a `User` entry
 * would be a no-op. We hide it in the role dropdown to prevent misleading rows.
 */
export const selectableRolesForVisibility = (
  visibility: AgentVisibility | undefined
): AgentAclRole[] => {
  if (visibility === AgentVisibility.Public || visibility === AgentVisibility.Shared) {
    return [AgentAclRole.Editor, AgentAclRole.Manager];
  }
  return ROLE_ORDER;
};
