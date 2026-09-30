/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, NotificationsStart } from '@kbn/core/public';
import type { ResolvedActionEvent } from '@kbn/a2ui-renderer';
import { ACTION_NAVIGATE, ACTION_RUN_WORKFLOW } from '../../common/constants';

export interface ActionHandlerDeps {
  application: ApplicationStart;
  notifications: NotificationsStart;
  /** Resolves once the user confirms; M3 replaces this with the real workflow call. */
  runWorkflow?: (workflowId: string, inputs: Record<string, unknown>) => Promise<void>;
}

/**
 * The single place a generated document can reach Kibana behaviour. Event names
 * are matched against a closed list — an unrecognised name surfaces as an error
 * toast rather than being ignored, so a malformed app is visible rather than
 * silently inert.
 */
export function createActionHandler({
  application,
  notifications,
  runWorkflow,
}: ActionHandlerDeps) {
  return async (event: ResolvedActionEvent): Promise<void> => {
    switch (event.name) {
      case ACTION_NAVIGATE: {
        const appId = event.context.appId;
        if (typeof appId !== 'string') {
          notifications.toasts.addDanger(`${ACTION_NAVIGATE} requires a string "appId"`);
          return;
        }
        const path = typeof event.context.path === 'string' ? event.context.path : undefined;
        await application.navigateToApp(appId, { path });
        return;
      }

      case ACTION_RUN_WORKFLOW: {
        const { workflowId, ...inputs } = event.context;
        if (typeof workflowId !== 'string') {
          notifications.toasts.addDanger(`${ACTION_RUN_WORKFLOW} requires a string "workflowId"`);
          return;
        }
        if (!runWorkflow) {
          notifications.toasts.addWarning({
            title: 'Workflow actions are not wired up yet',
            text: `Would run "${workflowId}" with ${JSON.stringify(inputs)}`,
          });
          return;
        }
        await runWorkflow(workflowId, inputs);
        return;
      }

      default:
        notifications.toasts.addDanger(`Unsupported action "${event.name}"`);
    }
  };
}
