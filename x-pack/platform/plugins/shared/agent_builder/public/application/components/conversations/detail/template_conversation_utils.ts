/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import type { ConversationTemplateProfile } from '@kbn/agent-builder-common/chat/conversation_metadata';

export type TemplateFieldRender = 'default' | 'badge' | 'severity_badge';

export interface TemplateFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: readonly string[];
  render?: TemplateFieldRender;
  show_in_header?: boolean;
}

export interface TemplateHeaderAction {
  id: string;
  label: string;
  iconType?: string;
  buttonType?: 'empty' | 'primary';
  enabled?: boolean;
  tooltip?: string;
}

interface PocTemplateDefinition {
  field_definitions: readonly TemplateFieldDefinition[];
  header_actions?: readonly TemplateHeaderAction[];
}

/** POC template registry — replaced by B2 ConversationTemplate registry. */
const POC_TEMPLATE_REGISTRY: Record<string, PocTemplateDefinition> = {
  'incident-triage-v2': {
    header_actions: [
      {
        id: 'run-playbook',
        label: 'Run playbook',
        iconType: 'play',
        buttonType: 'empty',
        enabled: false,
        tooltip: 'Coming in a follow-up release',
      },
      {
        id: 'push-jira',
        label: 'Push to Jira',
        iconType: 'popout',
        buttonType: 'primary',
        enabled: false,
        tooltip: 'Coming in a follow-up release',
      },
    ],
    field_definitions: [
      {
        key: 'severity',
        label: 'Severity',
        type: 'select',
        options: ['low', 'medium', 'high', 'critical'],
        render: 'severity_badge',
        show_in_header: true,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['open', 'in progress', 'closed'],
      },
      { key: 'mitre_technique', label: 'MITRE technique', type: 'text' },
      {
        key: 'affected_host',
        label: 'Affected host',
        type: 'text',
        render: 'badge',
      },
    ],
  },
  'research-notes-v1': {
    header_actions: [
      {
        id: 'export-notes',
        label: 'Export notes',
        iconType: 'exportAction',
        buttonType: 'empty',
        enabled: false,
        tooltip: 'Coming in a follow-up release',
      },
    ],
    field_definitions: [
      {
        key: 'topic',
        label: 'Topic',
        type: 'select',
        options: ['product', 'competitive', 'technical'],
      },
      {
        key: 'priority',
        label: 'Priority',
        type: 'select',
        options: ['low', 'medium', 'high'],
        render: 'severity_badge',
        show_in_header: true,
      },
      { key: 'summary', label: 'Summary', type: 'text' },
      {
        key: 'reference_url',
        label: 'Reference',
        type: 'text',
        render: 'badge',
      },
    ],
  },
};

export const resolveTemplateId = (
  conversation: Pick<Conversation, 'template_id' | 'template_snapshot'>
): string | undefined => {
  return conversation.template_snapshot?.template_id ?? conversation.template_id;
};

const getPocTemplateDefinition = (
  conversation: Pick<Conversation, 'template_id' | 'template_snapshot'>
): PocTemplateDefinition | undefined => {
  const templateId = resolveTemplateId(conversation);
  if (!templateId) {
    return undefined;
  }

  return POC_TEMPLATE_REGISTRY[templateId];
};

export const getTemplateFieldDefinitions = (
  conversation: Pick<Conversation, 'template_id' | 'template_snapshot'>
): TemplateFieldDefinition[] => {
  const template = getPocTemplateDefinition(conversation);
  if (!template) {
    return [];
  }

  return [...template.field_definitions];
};

export const getTemplateHeaderActions = (
  conversation: Pick<Conversation, 'template_id' | 'template_snapshot'>
): TemplateHeaderAction[] => {
  const template = getPocTemplateDefinition(conversation);
  if (!template?.header_actions) {
    return [];
  }

  return [...template.header_actions];
};

export interface TemplateHeaderField {
  definition: TemplateFieldDefinition;
  value: string;
}

export const getTemplateHeaderFields = (
  conversation: Pick<Conversation, 'template_id' | 'template_snapshot' | 'custom_fields'>
): TemplateHeaderField[] => {
  return getTemplateFieldDefinitions(conversation)
    .filter((definition) => definition.show_in_header)
    .map((definition) => ({
      definition,
      value: String(conversation.custom_fields?.[definition.key] ?? ''),
    }))
    .filter(({ value }) => value.length > 0);
};

/** Detail shell is shown when the conversation template declares structured fields. */
export const shouldShowTemplateDetailShell = (
  conversation?: Pick<Conversation, 'template_id' | 'template_snapshot'>
): boolean => {
  if (!conversation) {
    return false;
  }

  return getTemplateFieldDefinitions(conversation).length > 0;
};

export const isCollaborativeTemplateConversation = (
  conversation?: Pick<Conversation, 'template_snapshot' | 'conversation_mode'>
): boolean => {
  if (!conversation) {
    return false;
  }

  return (
    conversation.template_snapshot?.chat_mode === 'collaborative' ||
    conversation.conversation_mode === 'group'
  );
};

export const getTemplateLabel = (
  conversation: Pick<Conversation, 'template_id' | 'template_snapshot'>
): string => {
  const profile = conversation.template_snapshot?.profile;
  if (profile) {
    return profile;
  }
  return resolveTemplateId(conversation) ?? '';
};

export const getTemplateProfile = (
  conversation: Pick<Conversation, 'template_snapshot'>
): ConversationTemplateProfile | string | undefined => {
  return conversation.template_snapshot?.profile;
};

export const getSeverityBadgeColor = (
  severity: string
): 'default' | 'primary' | 'success' | 'warning' | 'danger' => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'primary';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

export const getFieldBadgeColor = (
  definition: TemplateFieldDefinition,
  value: string
): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'hollow' => {
  if (definition.render === 'severity_badge') {
    return getSeverityBadgeColor(value);
  }

  if (definition.render === 'badge') {
    return 'hollow';
  }

  return 'default';
};
