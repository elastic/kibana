/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export interface CreateIndicesOpts {
  esClient: ElasticsearchClient;
}

export const ALERT_EVENTS_INDEX = '.kibana_alert_events';
export const ALERT_ACTIONS_INDEX = '.kibana_alert_actions';
export const ALERT_TRANSITIONS_INDEX = '.kibana_alert_transitions';
export const NOTIFICATION_POLICY_INDEX = '.kibana_notification_policies';

export async function createIndices({ esClient }: CreateIndicesOpts) {
  await esClient.indices.delete({ index: ALERT_EVENTS_INDEX }, { ignore: [404] });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await esClient.indices.create({
    index: ALERT_EVENTS_INDEX,
    settings: {
      mode: 'lookup',
    },
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': { type: 'date' },
        rule: {
          properties: {
            id: { type: 'keyword' },
            tags: { type: 'keyword' },
            breach_count: { type: 'long' },
            recover_count: { type: 'long' },
          },
        },
        grouping: {
          properties: {
            key: { type: 'keyword' },
            value: { type: 'keyword' },
          },
        },
        data: { type: 'flattened' },
        parent_rule_id: { type: 'keyword' },
        status: { type: 'keyword' },
        alert_series_id: { type: 'keyword' },
        source: { type: 'keyword' },
      },
    },
  });

  await esClient.indices.delete({ index: ALERT_ACTIONS_INDEX }, { ignore: [404] });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await esClient.indices.create({
    index: ALERT_ACTIONS_INDEX,
    settings: {
      mode: 'lookup',
    },
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': { type: 'date' },
        // Tuple
        rule_id: { type: 'keyword' },
        alert_series_id: { type: 'keyword' },
        episode_id: { type: 'keyword' },
        // Other fields
        actor: { type: 'keyword' },
        action_type: { type: 'keyword' },
        expires: { type: 'date' },
        source: { type: 'keyword' },
        sev_level: { type: 'long' },
        matcher: { type: 'object' },
        reason: { type: 'text' },
        destination_id: { type: 'keyword' },
        tag: { type: 'keyword' },
        max_source_timestmap: { type: 'date' },
      },
    },
  });

  await esClient.indices.delete({ index: ALERT_TRANSITIONS_INDEX }, { ignore: [404] });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await esClient.indices.create({
    index: ALERT_TRANSITIONS_INDEX,
    settings: {
      mode: 'lookup',
    },
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': { type: 'date' },
        // Tuple
        rule_id: { type: 'keyword' },
        alert_series_id: { type: 'keyword' },
        episode_id: { type: 'keyword' },
        // Other fields
        start_state: { type: 'keyword' },
        end_state: { type: 'keyword' },
        last_event_timestamp: { type: 'date' },
      },
    },
  });

  await esClient.indices.delete({ index: NOTIFICATION_POLICY_INDEX }, { ignore: [404] });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await esClient.indices.create({
    index: NOTIFICATION_POLICY_INDEX,
    mappings: {
      dynamic: false,
      properties: {
        policy_id: { type: 'keyword' },
        route: {
          properties: {
            matcher: { type: 'object' },
            grouper: { type: 'keyword' },
            workflow_id: { type: 'keyword' },
            frequency: { type: 'keyword' },
            buffer: { type: 'keyword' },
          },
        },
      },
    },
  });
}
