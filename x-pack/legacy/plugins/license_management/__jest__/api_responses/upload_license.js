/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const UPLOAD_LICENSE_EXPIRED = [
  200,
  { 'Content-Type': 'application/json' },
  '{"acknowledged": "true", "license_status": "expired"}',
];

export const UPLOAD_LICENSE_REQUIRES_ACK = [
  200,
  { 'Content-Type': 'application/json' },
  `{
    "acknowledged":false,
    "license_status":"valid",
    "acknowledge":
      {
        "message": "This license update requires acknowledgement. To acknowledge the license, please read the following messages and update the license again, this time with the \\"acknowledge=true\\" parameter:",
        "watcher":["Watcher will be disabled"]
      }
    }`,
];

export const UPLOAD_LICENSE_SUCCESS = [
  200,
  { 'Content-Type': 'application/json' },
  '{"acknowledged": "true", "license_status": "valid"}',
];

export const UPLOAD_LICENSE_INVALID = [
  200,
  { 'Content-Type': 'application/json' },
  '{"acknowledged": "true", "license_status": "invalid"}',
];

export const UPLOAD_LICENSE_TLS_NOT_ENABLED = [
  200,
  { 'Content-Type': 'application/json' },
  `{
      "error":
      {
        "root_cause":
          [{
            "type":"illegal_state_exception",
            "reason":"Can not upgrade to a production license unless TLS is configured or security is disabled"
          }],"type":"illegal_state_exception",
          "reason":"Can not upgrade to a production license unless TLS is configured or security is disabled"},
          "status":500}
    `,
];
