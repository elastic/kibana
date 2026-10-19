/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { WorkloadIsolationResearchConfig } from './config';
import { Recorder } from './lib/recorder';
import { registerRoutes } from './routes';
import { registerResearchTasks, TickScheduler } from './tasks';
import { registerTierBRoutes, registerTierBTasks } from './tier_b';
import { registerMockLlmRoute } from './tier_b/canned_llm';
import { API_BASE } from './routes';

interface SetupDeps {
  taskManager: TaskManagerSetupContract;
}
interface StartDeps {
  taskManager: TaskManagerStartContract;
}

/** RESEARCH ONLY: workload isolation measurement harness. Never merge. */
export class WorkloadIsolationResearchPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  private readonly logger: Logger;
  private readonly config: WorkloadIsolationResearchConfig;
  private readonly recorder: Recorder;
  private ticks?: TickScheduler;

  constructor(private readonly context: PluginInitializerContext<WorkloadIsolationResearchConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.recorder = new Recorder(this.config, this.logger);
    const { roles } = context.node;
    this.recorder.roles = [roles.ui ? 'ui' : '', roles.backgroundTasks ? 'background_tasks' : '']
      .filter(Boolean)
      .join(',');
  }

  public setup(core: CoreSetup<StartDeps>, { taskManager }: SetupDeps): void {
    const getRecorder = () => this.recorder;
    registerResearchTasks(taskManager, getRecorder);
    registerTierBTasks(taskManager, getRecorder, async () => {
      const [coreStart] = await core.getStartServices();
      return coreStart.elasticsearch.client.asInternalUser;
    });
    const getStart = async () => {
      const [coreStart, { taskManager: tm }] = await core.getStartServices();
      if (!this.ticks) this.ticks = new TickScheduler(tm, this.logger, this.recorder);
      return { core: coreStart as CoreStart, taskManager: tm, ticks: this.ticks };
    };
    const router = core.http.createRouter();
    registerTierBRoutes(router, API_BASE, getRecorder, getStart);
    registerMockLlmRoute(router, API_BASE, this.config.mockLlm, async () => {
      const [coreStart] = await core.getStartServices();
      return coreStart.elasticsearch.client.asInternalUser;
    });
    registerRoutes({
      router,
      logger: this.logger,
      getRecorder,
      getStart,
      getInfo: () => ({
        pod: this.recorder.pod,
        boot_id: this.recorder.bootId,
        pid: process.pid,
        node: process.version,
        v8: process.versions.v8,
        cpus: os.cpus().length,
        available_parallelism: os.availableParallelism(),
        constrained_memory: process.constrainedMemory(),
        uptime_s: process.uptime(),
        config: this.config,
        node_roles: this.context.node.roles,
        kibana_version: this.context.env.packageInfo.version,
        build_sha: this.context.env.packageInfo.buildSha,
        exec_argv: process.execArgv,
        node_options: process.env.NODE_OPTIONS ?? null,
        tracer_enabled: process.env.KBN_RESEARCH_CONTRACT_TRACER === 'true',
        push_stats: this.recorder.pushStats,
      }),
    });
  }

  public start(core: CoreStart): void {
    this.recorder.start();
    this.recorder.startPush(async () => core.elasticsearch.client.asInternalUser);
  }

  public async stop(): Promise<void> {
    this.ticks?.stop();
    await this.recorder.stop();
  }
}
