/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { UiamApiKeyProvisioningEntityType } from '@kbn/uiam-api-keys-provisioning-status';
import { TAGS } from '../constants';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';
import { getErrorMessage } from './error_utils';

/**
 * Page size for the single flush fetch. Matches the Saved Objects `find` maximum page size so the
 * one-time flush clears every task status doc in a single pass (it latches afterwards and does not
 * re-run). If a deployment somehow exceeds this, the remainder is logged.
 */
const FLUSH_FETCH_PAGE_SIZE = 10000;

/**
 * Deletes every `task`-entity UIAM provisioning status doc. The pre-fix run left broken tasks with a
 * COMPLETED status that would otherwise exclude them from the provisioning fetch (see
 * {@link getExcludeTasksFilter}). Flushing makes them eligible again so the regular flow re-mints a
 * properly encrypted `uiamApiKey` (classification force-reconverts during the repair campaign).
 *
 * MUST run exactly once per repair campaign: a re-flush would also delete the COMPLETED status docs
 * written for tasks already re-provisioned in earlier batches, re-fetching and re-minting them.
 */
export const flushTaskProvisioningStatus = async (
  savedObjectsClient: ISavedObjectsRepository,
  logger: Logger
): Promise<number> => {
  const filter = nodeBuilder.is(
    `${UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE}.attributes.entityType`,
    UiamApiKeyProvisioningEntityType.TASK
  );
  try {
    const { saved_objects: savedObjects, total } = await savedObjectsClient.find<{
      entityId: string;
    }>({
      type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
      filter,
      perPage: FLUSH_FETCH_PAGE_SIZE,
      namespaces: ['*'],
    });
    if (savedObjects.length === 0) {
      return 0;
    }
    await savedObjectsClient.bulkDelete(
      savedObjects.map((so) => ({
        type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
        id: so.id,
      })),
      { refresh: true }
    );
    if (total > savedObjects.length) {
      // The flush latches after this run, so an unflushed remainder would not be retried. This is
      // only reachable if a deployment has more than FLUSH_FETCH_PAGE_SIZE task status docs.
      logger.warn(
        `Flushed only ${
          savedObjects.length
        } of ${total} task UIAM provisioning status document(s); ${
          total - savedObjects.length
        } not flushed.`,
        { tags: TAGS }
      );
    } else {
      logger.info(`Flushed ${savedObjects.length} task UIAM provisioning status document(s).`, {
        tags: TAGS,
      });
    }
    return savedObjects.length;
  } catch (error) {
    logger.error(`Failed to flush task UIAM provisioning status: ${getErrorMessage(error)}`, {
      error: { stack_trace: error instanceof Error ? error.stack : undefined, tags: TAGS },
    });
    throw error;
  }
};
