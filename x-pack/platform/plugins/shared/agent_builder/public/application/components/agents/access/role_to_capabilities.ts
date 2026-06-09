/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AgentAclRole, AgentVisibility } from '@kbn/agent-builder-common';

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

const ROLE_ORDER: AgentAclRole[] = [AgentAclRole.User, AgentAclRole.Editor, AgentAclRole.Manager];

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
