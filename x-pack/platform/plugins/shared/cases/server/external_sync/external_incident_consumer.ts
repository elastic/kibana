/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { partition } from 'lodash';
import type {
  CoreServiceAccountsService,
  KibanaRequest,
  Logger,
  PubSubEvent,
  PubSubSetup,
} from '@kbn/core/server';
import type { CasesClient } from '../client';
import type { ExternalIncidentUpdatedData } from './external_incident_topic';
import { externalIncidentUpdatedTopic } from './external_incident_topic';
import { EXTERNAL_SYNC_WORKLOAD_TYPE } from './service_account';

export const EXTERNAL_INCIDENT_CONSUMER = 'externalSync';

export interface ExternalIncidentConsumerServices {
  serviceAccounts: CoreServiceAccountsService;
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
}

interface SyncCasesForIncidentArgs extends ExternalIncidentConsumerServices {
  event: PubSubEvent<ExternalIncidentUpdatedData>;
  logger: Logger;
}

/**
 * Syncs every case pushed to the incident, as the service account bound to the connector.
 * The publisher's request is not available here, so nothing runs without a binding.
 */
export const syncCasesForIncident = async ({
  event,
  serviceAccounts,
  getCasesClient,
  logger,
}: SyncCasesForIncidentArgs): Promise<void> => {
  const { spaceId, connectorId, externalId } = event.data;
  const incident = `incident ${externalId} of connector ${connectorId} in space ${spaceId}`;

  if (!serviceAccounts.isEnabled()) {
    logger.warn(`Skipped the sync of ${incident}: service accounts are not enabled.`);
    return;
  }

  try {
    await serviceAccounts.withScopedRequestForWorkload(
      {
        spaceId,
        workloadType: EXTERNAL_SYNC_WORKLOAD_TYPE,
        workloadId: connectorId,
        executionId: event.id,
      },
      async (request) => {
        const casesClient = await getCasesClient(request);
        const cases = await casesClient.cases.findByExternalId({ externalId, connectorId });

        // A case moved to another connector since its push cannot be synced from this one.
        const [syncable, moved] = partition(
          cases,
          (theCase) => theCase.connector.id === connectorId
        );
        for (const theCase of moved) {
          logger.debug(`Skipped case ${theCase.id}: its connector changed after the push.`);
        }

        for (const theCase of syncable) {
          try {
            await casesClient.cases.sync({ caseId: theCase.id });
          } catch (error) {
            logger.warn(`Failed to sync case ${theCase.id} from ${incident}: ${error}`);
          }
        }
      }
    );
  } catch (error) {
    if (Boom.isBoom(error) && error.output.statusCode === 404) {
      logger.warn(`Skipped the sync of ${incident}: no service account is bound to the connector.`);
      return;
    }

    logger.error(`Failed to sync the cases of ${incident}: ${error}`);
  }
};

export const registerExternalIncidentConsumer = ({
  pubsub,
  getServices,
  logger,
}: {
  pubsub: PubSubSetup;
  getServices: () => Promise<ExternalIncidentConsumerServices>;
  logger: Logger;
}): void => {
  pubsub.subscribe(externalIncidentUpdatedTopic, {
    consumer: EXTERNAL_INCIDENT_CONSUMER,
    handler: async (event) => {
      const services = await getServices();
      await syncCasesForIncident({ event, logger, ...services });
    },
  });
};
