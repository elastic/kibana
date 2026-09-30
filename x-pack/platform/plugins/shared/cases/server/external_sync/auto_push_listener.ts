/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { NONE_CONNECTOR_ID } from '../../common/constants';
import type { CasesClient } from '../client';
import type { CasesEventBus } from '../events/event_bus';

export interface AutoPushListenerDeps {
  casesEventBus: CasesEventBus;
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
  isAtLeastEnterprise: () => Promise<boolean>;
  logger: Logger;
}

interface PendingPush {
  request: KibanaRequest;
  rerun: boolean;
}

/**
 * Pushes a case to its connector after a change when the case has
 * `settings.externalSync.autoPush` on. Runs as the user who made the change.
 */
export function registerAutoPushListener({
  casesEventBus,
  getCasesClient,
  isAtLeastEnterprise,
  logger,
}: AutoPushListenerDeps): void {
  const pending = new Map<string, PendingPush>();

  const pushIfNeeded = async (request: KibanaRequest, caseId: string): Promise<void> => {
    if (!(await isAtLeastEnterprise())) {
      return;
    }

    const casesClient = await getCasesClient(request);
    const theCase = await casesClient.cases.get({ id: caseId, includeComments: false });
    const connectorId = theCase.connector.id;

    if (theCase.settings.externalSync?.autoPush !== true || connectorId === NONE_CONNECTOR_ID) {
      return;
    }

    const connectors = await casesClient.userActions.getConnectors({ caseId });
    if (!connectors[connectorId]?.push.needsToBePushed) {
      return;
    }

    await casesClient.cases.push({ caseId, connectorId, pushType: 'automatic' });
  };

  const run = async (caseId: string): Promise<void> => {
    const entry = pending.get(caseId);
    if (entry == null) {
      return;
    }

    entry.rerun = false;

    try {
      await pushIfNeeded(entry.request, caseId);
    } catch (error) {
      logger.warn(`Automatic push of case ${caseId} failed: ${error}`);
    }

    // Changes that arrived while pushing are folded into one more push.
    if (entry.rerun) {
      return run(caseId);
    }

    pending.delete(caseId);
  };

  const schedule = (request: KibanaRequest, caseId: string): void => {
    const entry = pending.get(caseId);
    if (entry != null) {
      entry.request = request;
      entry.rerun = true;
      return;
    }

    pending.set(caseId, { request, rerun: false });
    void run(caseId);
  };

  casesEventBus.onCaseCreated((event) => schedule(event.request, event.payload.caseId));

  casesEventBus.onCaseUpdated((event) => {
    // Applying the external incident to the case must not push it straight back.
    if (event.payload.origin === 'external_sync') {
      return;
    }

    schedule(event.request, event.payload.caseId);
  });

  casesEventBus.onAttachmentsAdded((event) => schedule(event.request, event.payload.caseId));
}
