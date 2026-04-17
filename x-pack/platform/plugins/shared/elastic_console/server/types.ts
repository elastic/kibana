/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';

export interface ElasticConsoleSetupDependencies {
  cloud?: CloudSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}

export interface ElasticConsoleStartDependencies {
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export type ElasticConsolePluginSetup = Record<string, never>;

export type ElasticConsolePluginStart = Record<string, never>;
