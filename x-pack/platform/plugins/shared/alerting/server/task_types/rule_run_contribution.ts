/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';
import type { RuleRunActionsSetup } from '@kbn/actions-plugin/server/task_types/rule_run_actions';
import type { KibanaRequest } from '@kbn/core/server';
import type { TaskHost, TaskTypeModule } from '@kbn/task-manager-plugin/server/task_type_module';
import type { AlertingServerSetup } from '../plugin';
import type { GetAlertStatusChangedWorkflowsClient } from '../lib/workflow_extensions/alert_status_changed_emitter';

/** The contribution key under which plugins add what every rule run needs: see `kibana.jsonc`. */
export const RULE_RUN_CONTRIBUTIONS = 'alerting-rule-run';

/** What a contribution may use when it registers: the process, not the plugins around it. */
export interface RuleRunContributionContext {
  logger: Logger;
  isServerless: boolean;
  kibanaVersion: string;
  publicBaseUrl?: string;
  /** The validated configs Kibana sent, by plugin id (see `registerTaskProcessSettings`). */
  settings: Record<string, unknown>;
  /**
   * What the process runs on. A contribution reads what it needs of it when it is used (the feature
   * flags Kibana sent, `host.featureFlags`), not while it registers.
   */
  host: TaskHost;
  /** Resolves execution services lazily, after all workflow contributions have registered. */
  getService?: <T extends object>(id: string) => T;
}

/** The parts of the actions and alerting setup contracts a plugin registers its connectors through. */
export interface RuleRunRegistries {
  actions: RuleRunActionsSetup;
  alerting: Pick<AlertingServerSetup, 'registerConnectorAdapter' | 'enableAlertStatusChanged'>;
}

/** Native services owned by one rule execution and released before it completes. */
export interface RuleExecutionServices {
  getService: <T extends object>(id: string) => T;
  stop: () => Promise<void>;
}

/**
 * What a plugin adds to a rule run in a task process, as it adds it to Kibana in its `setup()`: the
 * connector types and connector adapters of system actions, and the saved object types they read.
 * Exported as `contribution` from a file listed under `taskTypeContributions` in the plugin's
 * `kibana.jsonc`, so a rule type never has to know about the plugins that add connectors.
 */
export interface RuleRunContribution {
  executionServices?: {
    ids: readonly string[];
    requirements: TaskTypeModule;
    isEnabled: (settings: NonNullable<TaskHost['settings']>) => boolean;
    create: (context: RuleRunContributionContext) => Promise<RuleExecutionServices>;
  };
  declares?: {
    savedObjectTypes?: SavedObjectsType[];
    encryptedSavedObjectTypes?: EncryptedSavedObjectTypeRegistration[];
    /**
     * Feature flags the contribution reads, with their fallbacks, as the `featureFlags` of a task type
     * module: Kibana evaluates them for each run it dispatches and sends the values (`host.featureFlags`).
     * The same flags go in `featureFlags` of the opt-in the plugin registers with Kibana.
     */
    featureFlags?: Record<string, boolean | string | number>;
    /**
     * Whether `register` calls `actions.registerType` or `actions.registerSubActionConnectorType`.
     * Read into the pack manifest (`TaskBundlePackManifest.registersConnectorTypes`) so a worker
     * narrowed to a resolved pack selection still loads whichever packs a workflow's connector
     * steps need, without the resolver having to know each connector type by name.
     */
    registersConnectorTypes?: boolean;
  };
  /**
   * The workflows client of a request, which a rule run uses to send `alert.status.changed` events
   * as Kibana's subscriber does with the client of the workflows extensions plugin (`getClient`).
   * Without a plugin that contributes it, a process sends no events, even when a plugin opted in.
   */
  getWorkflowsClient?: (
    request: KibanaRequest,
    context: RuleRunContributionContext
  ) => ReturnType<GetAlertStatusChangedWorkflowsClient>;
  register?: (registries: RuleRunRegistries, context: RuleRunContributionContext) => void;
}
