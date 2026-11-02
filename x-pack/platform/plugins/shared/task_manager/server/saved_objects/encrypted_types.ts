/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * How Task Manager's saved object types are encrypted. Registered with the Encrypted Saved Objects
 * plugin wherever tasks are written: Kibana (through `task_manager_dependencies`) and task pods that
 * schedule tasks themselves.
 */
export const TASK_ENCRYPTED_TYPES = [
  {
    type: 'task',
    attributesToEncrypt: new Set(['apiKey', 'uiamApiKey', 'encryptedCredential']),
    attributesToIncludeInAAD: new Set(['id', 'taskType', 'credential']),
    enforceRandomId: false,
  },
  {
    type: 'api_key_to_invalidate',
    attributesToEncrypt: new Set(['uiamApiKey']),
    attributesToIncludeInAAD: new Set(['apiKeyId', 'createdAt']),
  },
];
