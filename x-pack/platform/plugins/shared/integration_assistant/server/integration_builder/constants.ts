/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CEL_EXISTING_AUTH_CONFIG_FIELDS = [
  'oauth_id',
  'oauth_secret',
  'username',
  'password',
  'digest_username',
  'digest_password',
];

export const DEFAULT_CEL_PROGRAM = `# // Fetch the agent's public IP every minute and note when the last request was made.
# // It does not use the Resource URL configuration value.
# bytes(get("https://api.ipify.org/?format=json").Body).as(body, {
#     "events": [body.decode_json().with({
#         "last_requested_at": has(state.cursor) && has(state.cursor.last_requested_at) ?
#             state.cursor.last_requested_at
#         :
#             now
#     })],
#     "cursor": {"last_requested_at": now}
# })`;

export const DEFAULT_URL = 'https://server.example.com:8089/api';
