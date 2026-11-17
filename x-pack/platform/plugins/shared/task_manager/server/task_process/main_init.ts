/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { elasticsearchConfigFromEnv } from './es_config';
import type { TaskProcessInit } from './wire';

declare const __KBN_VERSION__: string | undefined;

/**
 * What a remote process takes from its environment besides the Elasticsearch connection:
 * ESO_ENCRYPTION_KEY and ESO_DECRYPTION_ONLY_KEYS (comma separated), KIBANA_SERVER_UUID,
 * KIBANA_BUILD_NUM, KIBANA_PUBLIC_BASE_URL, KIBANA_BASE_PATH, KIBANA_SERVERLESS, and TASK_PROCESS_SETTINGS, the path
 * of a JSON file `{ "settings": { "<pluginId>": <config> }, "uiSettingsOverrides": {}, "uiSettingsGlobalOverrides": {}, "parity": [{ "kind": "...", "ids": [] }] }` whose
 * configs use the format of `serializeSettings` (a duration is `{"__kind":"duration","ms":1000}`), and
 * "packs": ["..."].
 */
export const initFromEnv = (env: NodeJS.ProcessEnv = process.env): TaskProcessInit => {
  const file = env.TASK_PROCESS_SETTINGS
    ? (JSON.parse(readFileSync(env.TASK_PROCESS_SETTINGS, 'utf8')) as Pick<
        TaskProcessInit,
        | 'settings'
        | 'uiSettingsOverrides'
        | 'uiSettingsGlobalOverrides'
        | 'parity'
        | 'packs'
        | 'instrumentation'
        | 'executionContext'
      >)
    : {};
  return {
    kind: 'init',
    elasticsearch: elasticsearchConfigFromEnv(env),
    kibanaVersion: env.KIBANA_VERSION ?? __KBN_VERSION__ ?? 'unknown',
    authToken: env.TASK_PROCESS_TOKEN ?? '',
    server: {
      uuid: env.KIBANA_SERVER_UUID ?? '',
      buildNum: env.KIBANA_BUILD_NUM ? Number(env.KIBANA_BUILD_NUM) : Number.MAX_SAFE_INTEGER,
      publicBaseUrl: env.KIBANA_PUBLIC_BASE_URL,
      kibanaUrl: env.KIBANA_URL ?? env.KIBANA_PUBLIC_BASE_URL,
      basePath: env.KIBANA_BASE_PATH,
      isServerless: env.KIBANA_SERVERLESS === 'true',
      isDev: env.KIBANA_DEV === 'true',
    },
    encryptedSavedObjects: env.ESO_ENCRYPTION_KEY
      ? {
          encryptionKey: env.ESO_ENCRYPTION_KEY,
          decryptionOnlyKeys: (env.ESO_DECRYPTION_ONLY_KEYS ?? '')
            .split(',')
            .map((key) => key.trim())
            .filter(Boolean),
        }
      : undefined,
    instrumentation: file.instrumentation,
    executionContext: file.executionContext,
    settings: file.settings,
    uiSettingsOverrides: file.uiSettingsOverrides,
    uiSettingsGlobalOverrides: file.uiSettingsGlobalOverrides,
    parity: file.parity,
    packs: file.packs,
  };
};

/** Kibana, when it forked this process, sends `init` first; a remote process uses its environment. */
export const readTaskProcessInit = (): Promise<TaskProcessInit> => {
  if (process.send) {
    return new Promise<TaskProcessInit>((resolve) => {
      process.on('message', (message: TaskProcessInit) => {
        if (message?.kind === 'init') resolve(message);
      });
    });
  }
  return Promise.resolve(initFromEnv());
};
