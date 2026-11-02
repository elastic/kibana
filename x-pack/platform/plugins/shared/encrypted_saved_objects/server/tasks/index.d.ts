/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';

import type { ConfigSchema } from '../config';
import type { EncryptedSavedObjectTypeRegistration } from '../crypto';
import type { ClientInstanciator } from '../saved_objects';
export interface EncryptedSavedObjectsTasksSetup {
  canEncrypt: boolean;
  registerType: (registration: EncryptedSavedObjectTypeRegistration) => void;
}
export interface EncryptedSavedObjectsTasksStart {
  isEncryptionError: (error: Error) => boolean;
  getClient: ClientInstanciator;
}
/**
 * Encrypted saved objects for task runtimes: the same service, client and encryption extension as
 * the plugin, so tasks decrypt without calling Kibana. The runtime needs the same
 * `xpack.encryptedSavedObjects.encryptionKey` (and `keyRotation.decryptionOnlyKeys`) as Kibana in
 * its config, and one that has it can decrypt any encrypted saved object. Only what tasks use is
 * available (registering types, the client, `isEncryptionError`); migrations and model versions
 * are created by Kibana.
 */
declare class EncryptedSavedObjectsTasksPlugin
  implements TasksPlugin<EncryptedSavedObjectsTasksSetup, EncryptedSavedObjectsTasksStart>
{
  private readonly context;
  private getClient?;
  constructor(context: PluginInitializerContext<ReturnType<typeof ConfigSchema.validate>>);
  setup(core: CoreTasksSetup): EncryptedSavedObjectsTasksSetup;
  start(): EncryptedSavedObjectsTasksStart;
}
export declare const plugin: (
  context: PluginInitializerContext<any>
) => Promise<EncryptedSavedObjectsTasksPlugin>;
export declare const config: PluginConfigDescriptor;
export {};
