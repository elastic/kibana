/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InputType } from '../../common';

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

export const INPUTS_INCLUDE_SSL_CONFIG: readonly InputType[] = [
  'aws-cloudwatch',
  'aws-s3',
  'azure-blob-storage',
  'azure-eventhub',
  'gcp-pubsub',
  'gcs',
  'http_endpoint',
  'kafka',
  'tcp',
];

// The version of the package specification format used by this package https://github.com/elastic/package-spec/blob/main/spec/changelog.yml
export const FORMAT_VERSION = '3.1.4';

// Kibana versions compatible with this package
// Explicitly specifying both 8.13.0 and 9.0.0 ensures compatibility across major versions, as semantic versioning does not assume forward compatibility.
export const KIBANA_MINIMUM_VERSION = '^8.13.0 || ^9.0.0';
