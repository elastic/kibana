/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { BridgeCase, CaseBridgeService } from './case_bridge_service';
import { INVESTIGATION_CASE_ATTACHMENT_TYPE } from '../../common/cases_bridge';

/**
 * Status and access side effects hang off the Cases event bus rather than a route, so they run for
 * every way a case changes: the UI, the API, a workflow, or an agent.
 */
export const subscribeToCaseEvents = ({
  cases,
  service,
  logger,
}: {
  cases: CasesServerStart;
  service: CaseBridgeService;
  logger: Logger;
}): void => {
  cases.getCasesEventBus().onAttachmentsAdded(async (event) => {
    if (event.payload.attachmentType !== INVESTIGATION_CASE_ATTACHMENT_TYPE) {
      return;
    }
    try {
      await service.onInvestigationsAttached({
        request: event.request,
        caseId: event.payload.caseId,
        attachmentIds: event.payload.ids,
      });
    } catch (error) {
      logger.warn(
        `Investigations were attached to case ${
          event.payload.caseId
        }, but their back-links weren't written: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  });

  cases.getCasesEventBus().onCaseUpdated(async (event, { previousCase, updatedCase }) => {
    if (!previousCase || !updatedCase) {
      return;
    }
    try {
      await service.onCaseUpdated({
        request: event.request,
        previousCase: {
          id: previousCase.id,
          title: previousCase.attributes.title,
          incremental_id: previousCase.attributes.incremental_id,
          status: previousCase.attributes.status,
          assignees: previousCase.attributes.assignees ?? [],
          access: previousCase.attributes.access,
        } as BridgeCase,
        updatedCase: updatedCase as BridgeCase,
        closeLinkedInvestigations: event.payload.closeLinkedInvestigations,
      });
    } catch (error) {
      logger.warn(
        `Case ${updatedCase.id} changed, but its linked investigations weren't updated: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  });
};
