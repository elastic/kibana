/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal `CoreSetup`/`TaskManagerSetupContract` stand-ins that a plugin's real
 * `registerTaskDefinitions` / `savedObjects.registerType` calls run against, so the pod's task
 * registry is built from the plugin's own registration code rather than a hand-written list.
 *
 * Every captured saved-object type is a coupling-inventory row: the pod has to build a real
 * repository from exactly these type definitions instead of Kibana's full Saved Objects service.
 */

export interface CapturedTaskDefinition {
  readonly taskType: string;
  readonly title?: string;
  readonly timeout?: string;
  readonly maxAttempts?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly createTaskRunner: (context: any) => { run(): Promise<unknown>; cancel?(): Promise<unknown> };
}

export class FakeTaskManagerSetup {
  public readonly definitions = new Map<string, CapturedTaskDefinition>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public registerTaskDefinitions(defs: Record<string, any>): void {
    for (const [taskType, def] of Object.entries(defs)) {
      this.definitions.set(taskType, { ...def, taskType });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CapturedSoType = any;

export class FakeSavedObjectsServiceSetup {
  public readonly types = new Map<string, CapturedSoType>();

  public registerType(type: CapturedSoType): void {
    this.types.set(type.name, type);
  }
}

export class FakeEncryptedSavedObjectsSetup {
  public readonly types = new Map<string, unknown>();

  public registerType(type: { type: string }): void {
    this.types.set(type.type, type);
  }

  // Real plugins sometimes probe `canEncrypt` during setup; the pod never encrypts, only decrypts
  // connector secrets that were already written by Kibana (Stage B2).
  public canEncrypt = true;
}

/**
 * A plugin's `CoreSetup<TPluginsStart, TPluginStart>` narrowed to what task registration touches:
 * `getStartServices()` and the Saved Objects/License/etc. setup contracts a plugin registers
 * types against. Each entry a real `plugin.ts` dereferences during setup or inside `run()` is a
 * port; everything else throws so an unported dependency fails loudly instead of silently.
 */
export const unimplemented = (path: string) => () => {
  throw new Error(`pod fake core: '${path}' is not ported`);
};
