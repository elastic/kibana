/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SLACK_API_CONNECTOR_ID = '.slack_api';
export const SLACK_URL = 'https://slack.com/api/';

export const SUB_ACTION = {
  POST_MESSAGE: 'postMessage',
  GET_CHANNELS: 'getChannels',
  GET_USERS: 'getUsers',
  SEARCH_CHANNELS: 'searchChannels',
} as const;
