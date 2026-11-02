/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectsTasksSetup, EncryptedSavedObjectsTasksStart } from '.';
/** The real plugin contracts in Kibana; a task pod builds its own service. */
export declare const encryptedSavedObjectsBridge: import('@kbn/core-plugins-server').TasksKibanaBridge<
  EncryptedSavedObjectsTasksSetup,
  EncryptedSavedObjectsTasksStart
>;
