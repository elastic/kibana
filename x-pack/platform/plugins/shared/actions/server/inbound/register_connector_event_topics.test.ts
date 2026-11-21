/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorsSpecs } from '@kbn/connector-specs';
import { slack2HitlAction } from '@kbn/connector-topics';

import { registerConnectorEventTopics } from './register_connector_event_topics';

const CONNECTOR_EVENT_TOPIC_NAMES = [
  'datadog.alert',
  'github.check_run',
  'github.deployment_status',
  'github.issue_comment',
  'github.issues',
  'github.pull_request',
  'github.pull_request_review',
  'github.push',
  'github.release',
  'inboundWebhook.received',
  'microsoft-teams.channel_created',
  'microsoft-teams.channel_message',
  'microsoft-teams.chat_created',
  'microsoft-teams.chat_message',
  'microsoft-teams.team_member_added',
  'servicenow_search.change_approval_state_changed',
  'servicenow_search.comment_added',
  'servicenow_search.incident_created',
  'servicenow_search.incident_resolved',
  'servicenow_search.incident_updated',
  'servicenow_search.work_note_added',
  'slack2.app_mention',
  'slack2.channel_created',
  'slack2.file_public',
  'slack2.file_shared',
  'slack2.member_joined_channel',
  'slack2.message',
  'slack2.reaction_added',
  'slack2.slash_command',
  'slack2.team_join',
] as const;

describe('registerConnectorEventTopics', () => {
  it('registers each spec event id except slack2.hitl_action', () => {
    const registerTopic = jest.fn();
    const topics = registerConnectorEventTopics(registerTopic);
    const registeredNames = registerTopic.mock.calls.map(([topic]) => topic.name);
    const specEventIds = Object.values(connectorsSpecs).flatMap((spec) =>
      spec.events
        ? Object.values(spec.events.definitions).map((definition) => definition.eventId)
        : []
    );

    expect(specEventIds).toContain(slack2HitlAction.name);
    expect(registeredNames).toEqual(
      specEventIds.filter((eventId) => eventId !== slack2HitlAction.name)
    );
    expect([...registeredNames].sort()).toEqual([...CONNECTOR_EVENT_TOPIC_NAMES]);
    expect(registeredNames).not.toContain(slack2HitlAction.name);
    expect([...topics.keys()]).toEqual(registeredNames);
    for (const [eventId, topic] of topics) {
      expect(topic.name).toBe(eventId);
    }
  });
});
