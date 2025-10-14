/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConversationSummary {
  user_id: string;
  user_name: string;
  agent_id: string;
  space: string;
  title: string;
  created_at: string;
  updated_at: string;
  summary: string;
}
