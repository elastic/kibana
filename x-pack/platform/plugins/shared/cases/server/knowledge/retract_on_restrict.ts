/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { CasesEventBus } from '../events/event_bus';
import { CASES_OUTCOMES_AI_INDEX_ID, getCaseOutcomeKiId } from '../../common/constants';

export const CASES_OUTCOMES_INDEX = `ai-index-idx-${CASES_OUTCOMES_AI_INDEX_ID}`;

/**
 * Removes a case's published outcome the moment the case becomes restricted. The publish workflow
 * can't do it: Cases emits no workflow event for a restricted case. Deleting the document (not a
 * soft delete) is deliberate: nothing about a restricted case stays readable. It runs as the person
 * who restricted the case, like every knowledge write: Kibana's internal user can't write the
 * context engine's indices. Without that privilege the outcome stays, and Prior outcomes still
 * hides it from anyone who can't open the case.
 */
export const subscribeRetractOutcomeOnRestrict = ({
  eventBus,
  getEsClient,
  logger,
}: {
  eventBus: CasesEventBus;
  getEsClient: (request: KibanaRequest) => Promise<ElasticsearchClient>;
  logger: Logger;
}): void => {
  eventBus.onCaseUpdated(async (event, { previousCase, updatedCase }) => {
    const wasRestricted = previousCase?.attributes.access?.mode === 'restricted';
    if (updatedCase?.access?.mode !== 'restricted' || wasRestricted) return;
    try {
      const esClient = await getEsClient(event.request);
      const { deleted, failures } = await esClient.deleteByQuery({
        index: CASES_OUTCOMES_INDEX,
        query: { term: { id: getCaseOutcomeKiId(updatedCase.id) } },
        ignore_unavailable: true,
        allow_no_indices: true,
        refresh: true,
      });
      if ((failures?.length ?? 0) > 0) {
        throw new Error(JSON.stringify(failures).slice(0, 500));
      }
      logger.debug(
        `Removed ${deleted ?? 0} published outcome(s) of restricted case ${updatedCase.id}`
      );
    } catch (error) {
      logger.warn(
        `Case ${updatedCase.id} became restricted, but removing its published outcome failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  });
};
