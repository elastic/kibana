/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createDashboardAttachmentType } from '../attachment_types';

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
}

/**
 * The agent builder side of the dashboards plugin for a task pod: the dashboard attachment type, the
 * same definition the `server` entry registers. Reading a dashboard from its origin (resolving an
 * attachment and checking it for staleness) needs the Dashboard plugin, which does not run in a task
 * pod: they log a warning and keep the attachment's snapshot, as they do when a read fails in Kibana.
 *
 * Not registered here: the dashboards skill, because its `generate_dashboard` tool validates panels
 * against the Embeddable plugin's registered panel types (also not in a pod) and would only fail, at
 * the cost of the Lens and ES|QL packages; and the dashboard search-memory type, which belongs to the
 * agent builder SML plugin, which has no tasks entry.
 */
class AgentBuilderDashboardsTasksPlugin implements TasksPlugin<void, void, TasksSetupDeps> {
  constructor(private readonly context: PluginInitializerContext) {}

  setup(_core: CoreTasksSetup, { agentBuilder }: TasksSetupDeps) {
    agentBuilder.attachments.registerType(
      createDashboardAttachmentType({
        logger: this.context.logger.get(),
        getDashboardClient: () =>
          Promise.reject(
            new Error(
              'Reading a dashboard is not supported in a task pod: the Dashboard plugin does not run in a task pod. Run this in Kibana.'
            )
          ),
      }) as Parameters<typeof agentBuilder.attachments.registerType>[0]
    );
  }

  start() {}
}

export const plugin = async (context: PluginInitializerContext) =>
  new AgentBuilderDashboardsTasksPlugin(context);
