/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { NightshiftInvestigationsServerStart } from '@kbn/nightshift-investigations-plugin/server';
import { InvestigationUnavailableError } from '@kbn/nightshift-investigations-plugin/server';
import type { SignificantEvent } from '@kbn/significant-events-schema';

/**
 * Starts the investigation for the given significant event via the nightshift
 * investigations client, in the caller's current space. Returns the execution id
 * when started, or undefined when nightshift investigations is unavailable.
 */
export const triggerInvestigationWorkflow = async ({
  nightshiftInvestigations,
  request,
  logger,
  event,
}: {
  nightshiftInvestigations?: NightshiftInvestigationsServerStart;
  request: KibanaRequest;
  logger: Logger;
  event: SignificantEvent;
}): Promise<string | undefined> => {
  if (!nightshiftInvestigations) {
    logger.debug('nightshiftInvestigations not available, skipping investigation trigger');
    return undefined;
  }

  const {
    title,
    summary,
    stream_names,
    event_uuid,
    event_id,
    status,
    severity,
    confidence,
    causal_features,
    blast_radius,
  } = event;

  const client = nightshiftInvestigations.getInvestigationsClient(request);

  let investigationId: string;
  try {
    const response = await client.start({
      subject: { type: 'significant_event', id: event_id, summary },
      trigger_type: 'manual',
      message: `${title}\n\n${summary}`,
      stream_names: stream_names ?? [],
      concurrency_key: event_id,
      context: {
        event_uuid,
        event_id,
        status,
        severity,
        confidence,
        causal_features: causal_features ?? [],
        blast_radius: blast_radius ?? [],
      },
    });
    investigationId = response.investigation_id;
  } catch (err) {
    if (err instanceof InvestigationUnavailableError) {
      logger.warn(`Investigation trigger failed for event "${event_uuid}": ${err.message}`);
      return undefined;
    }
    throw err;
  }

  logger.info(
    `Triggered investigation workflow for event "${event_uuid}", executionId=${investigationId}`
  );
  return investigationId;
};
