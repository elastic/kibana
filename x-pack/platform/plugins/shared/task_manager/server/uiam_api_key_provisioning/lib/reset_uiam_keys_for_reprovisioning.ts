/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { UiamApiKeyProvisioningEntityType } from '@kbn/uiam-api-keys-provisioning-status';
import { TASK_MANAGER_INDEX } from '../../constants';
import { TAGS } from '../constants';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';
import { getErrorMessage } from './error_utils';

/**
 * Page size for the single flush fetch. Matches the Saved Objects `find` maximum page size so the
 * one-time repair flushes every task status doc in a single pass (the repair latches afterwards and
 * does not re-run). If a deployment somehow exceeds this, the remainder is logged.
 */
const FLUSH_FETCH_PAGE_SIZE = 10000;

/**
 * Painless script that removes the UIAM fields from a `task` doc. Removing `uiamApiKey` and
 * `userScope.uiamApiKeyId` (and not touching `id`/`taskType`) leaves the Elasticsearch `apiKey`
 * fully decryptable — only `id` and `taskType` are in that attribute's AAD — so the task keeps
 * working while it waits to be re-provisioned with a properly encrypted UIAM key.
 */
const STRIP_UIAM_FIELDS_SCRIPT = `
if (ctx._source.task != null) {
  ctx._source.task.remove('uiamApiKey');
  if (ctx._source.task.userScope != null) {
    ctx._source.task.userScope.remove('uiamApiKeyId');
  }
}
`;

/**
 * Removes the UIAM fields from every provisioned `task` doc so the next provisioning run treats
 * them as un-provisioned and re-mints a properly encrypted `uiamApiKey`. This is the remediation
 * for docs whose `uiamApiKey` was persisted in plaintext by the pre-fix run.
 *
 * Done with `update_by_query` (rather than the Saved Objects client) because removing an attribute
 * is not expressible via a partial SO update — `uiamApiKey` is `schema.maybe(schema.string())`, so
 * it cannot be cleared with `null`, and a partial update cannot delete a key. The wrongly minted
 * UIAM keys are intentionally NOT invalidated; they are abandoned.
 */
export const stripUiamKeysFromProvisionedTasks = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<number> => {
  try {
    const response = await esClient.updateByQuery({
      index: TASK_MANAGER_INDEX,
      refresh: true,
      // A concurrently claimed task bumps the doc version; skip those rather than fail the whole
      // operation. They keep their (plaintext) key until a later repair pass clears it.
      conflicts: 'proceed',
      query: {
        bool: {
          filter: [{ exists: { field: 'task.userScope.uiamApiKeyId' } }],
        },
      },
      script: { source: STRIP_UIAM_FIELDS_SCRIPT, lang: 'painless' },
    });
    const updated = response.updated ?? 0;
    logger.info(
      `Stripped UIAM keys from ${updated} provisioned task(s) for re-provisioning (${
        response.version_conflicts ?? 0
      } version conflict(s) skipped).`,
      { tags: TAGS }
    );
    return updated;
  } catch (error) {
    logger.error(`Failed to strip UIAM keys from provisioned tasks: ${getErrorMessage(error)}`, {
      error: { stack_trace: error instanceof Error ? error.stack : undefined, tags: TAGS },
    });
    throw error;
  }
};

/**
 * Deletes every `task`-entity UIAM provisioning status doc. Without this flush the stripped tasks
 * would still carry a COMPLETED status and be excluded from the provisioning fetch
 * (see {@link getExcludeTasksFilter}), so they would never be re-provisioned.
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
      // The repair latches after this run, so an unflushed remainder would not be retried. This is
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

/**
 * One-time remediation: strip plaintext UIAM keys from all provisioned tasks and flush their
 * provisioning status, so the regular provisioning flow re-mints properly encrypted keys. Returns
 * how many tasks/status docs were touched.
 */
export const resetUiamKeysForReprovisioning = async (
  esClient: ElasticsearchClient,
  savedObjectsClient: ISavedObjectsRepository,
  logger: Logger
): Promise<{ tasksStripped: number; statusDocsFlushed: number }> => {
  const tasksStripped = await stripUiamKeysFromProvisionedTasks(esClient, logger);
  const statusDocsFlushed = await flushTaskProvisioningStatus(savedObjectsClient, logger);
  return { tasksStripped, statusDocsFlushed };
};
