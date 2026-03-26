/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Document } from 'yaml';

export type EpisodeStatus = 'active' | 'recovering' | 'inactive';

export interface GenerateWorkflowYamlParams {
  name: string;
  description?: string;
  connector: {
    connectorId: string;
    type: string;
  };
  notifyOn: EpisodeStatus[];
  messages: Record<string, Record<string, unknown>>;
}

const PLACEHOLDER_MAP: Record<string, string> = {
  '{ruleId}': '{{ inputs.ruleId }}',
  '{policyId}': '{{ inputs.policyId }}',
  '{groupKey}': '{{ inputs.groupKey | json }}',
  '{episodeId}': '{{ foreach.item.episode_id }}',
  '{episodeStatus}': '{{ foreach.item.episode_status }}',
  '{groupHash}': '{{ foreach.item.group_hash }}',
  '{lastEventTimestamp}': '{{ foreach.item.last_event_timestamp }}',
  '{episodeCount}': '{{ inputs.episodes | size }}',
};

export const AVAILABLE_PLACEHOLDERS = Object.entries(PLACEHOLDER_MAP).map(
  ([placeholder, liquid]) => ({
    placeholder,
    expandsTo: liquid,
    description: placeholderDescription(placeholder),
  })
);

function placeholderDescription(placeholder: string): string {
  const descriptions: Record<string, string> = {
    '{ruleId}': 'ID of the rule that produced this notification',
    '{policyId}': 'ID of the notification policy that matched',
    '{groupKey}': 'Grouping key for the notification group (JSON)',
    '{episodeId}': 'Unique ID of the current alert episode (inside foreach loop)',
    '{episodeStatus}': 'Current lifecycle status of the episode (inside foreach loop)',
    '{groupHash}': 'Hash identifying the alert series/group (inside foreach loop)',
    '{lastEventTimestamp}': 'Timestamp of the latest event for this episode (inside foreach loop)',
    '{episodeCount}': 'Total number of episodes in this notification group',
  };
  return descriptions[placeholder] ?? '';
}

export function expandPlaceholders(value: unknown): unknown {
  if (typeof value === 'string') {
    let result = value;
    for (const [placeholder, liquid] of Object.entries(PLACEHOLDER_MAP)) {
      result = result.replaceAll(placeholder, liquid);
    }
    return result;
  }
  if (Array.isArray(value)) {
    return value.map(expandPlaceholders);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expandPlaceholders(v)]));
  }
  return value;
}

const NOTIFICATION_WORKFLOW_INPUTS_SCHEMA = {
  properties: {
    id: { type: 'string', description: 'Unique identifier of the notification group' },
    ruleId: {
      type: 'string',
      description: 'Identifier of the rule that produced this notification group',
    },
    policyId: {
      type: 'string',
      description: 'Identifier of the notification policy that matched and dispatched the group',
    },
    groupKey: {
      type: 'object',
      description: 'Grouping key for the notification group',
      additionalProperties: true,
    },
    episodes: {
      type: 'array',
      description: 'Alert episodes included in this notification group',
      items: {
        type: 'object',
        properties: {
          last_event_timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp of the latest event seen for this episode',
          },
          rule_id: {
            type: 'string',
            description: 'Identifier of the rule that produced this episode',
          },
          group_hash: {
            type: 'string',
            description: 'Hash identifying the alert series/group this episode belongs to',
          },
          episode_id: {
            type: 'string',
            description: 'Unique identifier of the alert episode',
          },
          episode_status: {
            type: 'string',
            description: 'Current lifecycle status of the alert episode',
            enum: ['inactive', 'pending', 'active', 'recovering'],
          },
        },
        required: ['last_event_timestamp', 'rule_id', 'group_hash', 'episode_id', 'episode_status'],
        additionalProperties: false,
      },
    },
  },
  required: ['id', 'ruleId', 'policyId', 'groupKey', 'episodes'],
  additionalProperties: false,
};

const STATUS_IF_CONDITIONS: Record<EpisodeStatus, string> = {
  active: "${{ foreach.item.episode_status == 'active' }}",
  recovering: "${{ foreach.item.episode_status == 'recovering' }}",
  inactive: "${{ foreach.item.episode_status == 'inactive' }}",
};

export function generateNotificationWorkflowYaml(params: GenerateWorkflowYamlParams): string {
  const { name, description, connector, notifyOn, messages } = params;

  const foreachSteps = notifyOn.map((status) => {
    const rawWithParams = messages[status] ?? {};
    const expandedWithParams = expandPlaceholders(rawWithParams) as Record<string, unknown>;

    return {
      name: `notify_${status}`,
      type: connector.type,
      'connector-id': connector.connectorId,
      if: STATUS_IF_CONDITIONS[status],
      with: expandedWithParams,
    };
  });

  const workflowDefinition: Record<string, unknown> = {
    version: '1',
    name,
    ...(description ? { description } : {}),
    enabled: true,
    triggers: [{ type: 'manual' }],
    inputs: NOTIFICATION_WORKFLOW_INPUTS_SCHEMA,
    steps: [
      {
        name: 'for_each_episode',
        type: 'foreach',
        foreach: '{{ inputs.episodes | json }}',
        steps: foreachSteps,
      },
    ],
  };

  const doc = new Document(workflowDefinition);
  return doc.toString({ lineWidth: 120 });
}
