/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreAuditService,
  CoreTasksSetup,
  CoreTasksStart,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import {
  type CompatibleModule,
  type ConfigSchema,
  type MlFeatures,
  initEnabledFeatures,
} from '../../common/constants/app';
import { MlLicense } from '../../common/license';
import { configSchema } from '../config_schema';
import { initMlServerLog } from '../lib/log';
import type { MlAuthorizationService } from '../lib/capabilities/check_capabilities';
import { registerAnomalyDetectionAgentBuilder } from '../agent_builder/register_anomaly_detection';
import { setupSavedObjects } from '../saved_objects/saved_objects';
import { savedObjectClientsFactory } from '../saved_objects/util';
import { mlBridge } from './bridge';

export const config: PluginConfigDescriptor<ConfigSchema> = { schema: configSchema };

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
  spaces?: unknown;
}

interface TasksStartDeps {
  licensing: LicensingTasksStart;
  security: SecurityTasksStart;
}

/**
 * The agent builder side of Machine Learning for a task pod: the anomaly detection skill (its tools)
 * and the anomaly attachment types, built from the same registration the plugin runs in Kibana.
 *
 * A pod has no Data Views service, so the tools that recognise or read modules (they need a data
 * view) report that they are unavailable. Capabilities of a request are checked through privileges
 * (the pod's requests are API key requests), the ML saved objects are initialized by Kibana.
 */
class MlTasksPlugin implements TasksPlugin<void, void, TasksSetupDeps, TasksStartDeps> {
  private readonly enabledFeatures: MlFeatures = { ad: true, dfa: true, nlp: true };
  private readonly compatibleModuleType: CompatibleModule | null;
  private readonly mlLicense = new MlLicense();
  private readonly isServerless: boolean;
  private savedObjects: CoreTasksStart['savedObjects'] | null = null;
  private auditService: CoreAuditService | null = null;
  private authz?: SecurityTasksStart['authz'];

  constructor(private readonly context: PluginInitializerContext<ConfigSchema>) {
    const mlConfig = context.config.get();
    initEnabledFeatures(this.enabledFeatures, mlConfig);
    this.compatibleModuleType = mlConfig.compatibleModuleType ?? null;
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(core: CoreTasksSetup<TasksStartDeps>, { agentBuilder, spaces }: TasksSetupDeps) {
    // In Kibana the plugin's server entry registered all of this.
    if (mlBridge.getSetup()) return;
    if (!this.enabledFeatures.ad) return;

    initMlServerLog({ log: this.context.logger.get() });
    setupSavedObjects(core.savedObjects as never);

    const { getInternalSavedObjectsClient } = savedObjectClientsFactory(() => this.savedObjects);
    // Security's tasks contract exists from `start` on, a tool only runs after it.
    const getAuthz = () => {
      if (!this.authz) throw new Error('ML tools ran before the task runtime started');
      return this.authz;
    };
    const authorization = {
      get actions() {
        return getAuthz().actions;
      },
      get mode() {
        return getAuthz().mode;
      },
      checkPrivilegesWithRequest: (request) => getAuthz().checkPrivilegesWithRequest(request),
      checkPrivilegesDynamicallyWithRequest: (request) =>
        getAuthz().checkPrivilegesDynamicallyWithRequest(request),
    } as MlAuthorizationService;

    registerAnomalyDetectionAgentBuilder({
      agentBuilder,
      // A pod only serves API key requests, which are authorized through privileges.
      resolveMlCapabilities: async () => {
        throw new Error('ML capabilities of a request are not resolved in a task pod');
      },
      authorization,
      mlLicense: this.mlLicense,
      enabledFeatures: this.enabledFeatures,
      mlClientFactoryDeps: {
        getInternalSavedObjectsClient,
        getAuditService: () => this.auditService,
        spacesEnabled: spaces !== undefined,
        authorization,
        mlLicense: this.mlLicense,
        serverless: { isServerless: this.isServerless, cpsEnabled: false },
        // Kibana initializes the ML saved objects.
        isMlReady: () => Promise.resolve(),
        compatibleModuleType: this.compatibleModuleType,
      },
    });
  }

  start(core: CoreTasksStart, plugins: TasksStartDeps) {
    this.savedObjects = core.savedObjects;
    this.auditService = core.security.audit;
    this.authz = plugins.security.authz;
    this.mlLicense.setup(plugins.licensing.license$);
  }

  stop() {
    this.mlLicense.unsubscribe();
  }
}

export const plugin = async (context: PluginInitializerContext<ConfigSchema>) =>
  new MlTasksPlugin(context);
