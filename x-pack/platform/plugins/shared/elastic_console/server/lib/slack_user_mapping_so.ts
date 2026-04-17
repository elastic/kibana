/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Saved object type for Slack user → Kibana user mappings.
// One document per Slack user, keyed by slack_user_id.
// Allows conversations created from Slack to be attributed to the correct Kibana user.

export const SLACK_USER_MAPPING_SO_TYPE = 'elastic-console-slack-user-mapping';

export interface SlackUserMappingAttributes {
  slack_user_id: string;
  kibana_username: string;
  kibana_user_id?: string;
  created_at: string;
  updated_at: string;
}
