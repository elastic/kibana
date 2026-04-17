/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Saved object type for Slack credentials (encrypted bot token).
// Registered in plugin setup and used at runtime to store/retrieve the bot token
// received from the router after OAuth completion.

export const SLACK_CREDENTIALS_SO_TYPE = 'elastic-console-slack-credentials';
export const SLACK_CREDENTIALS_SO_ID = '550e8400-e29b-41d4-a716-446655440001';
