/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, RequestHandlerContext } from '@kbn/core/server';

import {
  FLEET_INTEGRATION_INSTALLED_TRIGGER_ID,
  type IntegrationInstalledEvent,
} from '../../../../common/triggers/integration_installed_trigger';

/**
 * Emits a `fleet.integrationInstalled` workflow trigger event after a
 * successful package installation. Silently catches errors so that a
 * missing or misconfigured workflowsExtensions plugin never blocks the
 * install flow.
 */
export const emitIntegrationInstalledEvent = async ({
  context,
  payload,
  logger,
}: {
  context: RequestHandlerContext;
  payload: IntegrationInstalledEvent;
  logger: Logger;
}): Promise<void> => {
  try {
    const workflows = await (
      context as RequestHandlerContext & {
        workflows?: Promise<{
          isWorkflowsAvailable: boolean;
          emitEvent: (triggerId: string, payload: Record<string, unknown>) => Promise<void>;
        }>;
      }
    ).workflows;
    if (!workflows || typeof workflows.emitEvent !== 'function') {
      return;
    }
    await workflows.emitEvent(FLEET_INTEGRATION_INSTALLED_TRIGGER_ID, payload);
    logger.debug(
      `Emitted ${FLEET_INTEGRATION_INSTALLED_TRIGGER_ID} event for package "${payload.package_name}@${payload.package_version}"`
    );
  } catch (error) {
    logger.warn(
      `Could not emit ${FLEET_INTEGRATION_INSTALLED_TRIGGER_ID} event for package "${payload.package_name}@${payload.package_version}": ${error.message}`
    );
  }
};
