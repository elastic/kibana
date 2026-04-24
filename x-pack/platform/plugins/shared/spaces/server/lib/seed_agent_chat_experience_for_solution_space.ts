/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { CoreStart, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { stripVersionQualifier } from '@kbn/std';

/**
 * Must match {@link PREFERRED_CHAT_EXPERIENCE_SETTING_KEY} in
 * `ai_assistant_management/selection/common/ui_setting_keys.ts`.
 */
const PREFERRED_CHAT_EXPERIENCE_KEY = 'aiAssistant:preferredChatExperience';

const LOG_PREFIX = '[preferredChatExperience seed]';

/**
 * Converts a space ID to the saved-objects namespace string that should be
 * passed as `options.namespace` to repository operations.
 *
 * The spaces extension's `getCurrentNamespace` does the same conversion, but it
 * is only available on request-scoped repositories.  For an internal repository
 * (created with `createInternalRepository`) there is no spaces extension, so we
 * must pass the namespace explicitly in each operation's options.
 *
 * - `'default'` → `undefined`  (default namespace, no prefix in ES)
 * - any other string → returned as-is  (e.g. `'test'` → `'test'`)
 */
function spaceIdToNamespaceString(spaceId: string): string | undefined {
  return spaceId === 'default' ? undefined : spaceId;
}

export interface SeedAgentChatExperienceForSolutionSpaceParams {
  coreStart: CoreStart;
  log: Logger;
  spaceId: string;
  /** Space solution view (Classic, Observability, etc.); logged for diagnostics only. */
  solution: string | undefined;
  packageInfo: { version: string; buildNum: number };
}

/**
 * Persists Agent as the preferred chat experience for new Classic, Security, or Observability spaces.
 *
 * Only seeds for `classic`, `security`, and `oblt` solution views — ES spaces and spaces with no
 * solution retain the schema default. Uses the internal repository and merges into the versioned
 * `config` document. If another writer (e.g. UI settings bootstrap) creates that document first,
 * a create can return 409; we then `update` so Agent still wins.
 */
export async function seedAgentChatExperienceForSolutionSpace(
  params: SeedAgentChatExperienceForSolutionSpaceParams
): Promise<void> {
  const { coreStart, log, spaceId, solution, packageInfo } = params;

  if (solution !== 'classic' && solution !== 'security' && solution !== 'oblt') {
    return;
  }

  const configId = stripVersionQualifier(packageInfo.version);
  const preferenceAttributes = {
    [PREFERRED_CHAT_EXPERIENCE_KEY]: AIChatExperience.Agent,
  };

  try {
    const namespace = spaceIdToNamespaceString(spaceId);
    const client = coreStart.savedObjects.createInternalRepository(['config']);

    await writePreferredChatExperience({
      log,
      client,
      configId,
      namespace,
      buildNum: packageInfo.buildNum,
      preferenceAttributes,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    log.warn(
      `${LOG_PREFIX} failed — space was still created; inspect config saved object in this namespace ${JSON.stringify(
        {
          spaceId,
          solutionView: solution,
          configSavedObjectId: configId,
          errorMessage,
          errorStack,
        }
      )}`
    );
  }
}

async function writePreferredChatExperience({
  log,
  client,
  configId,
  namespace,
  buildNum,
  preferenceAttributes,
}: {
  log: Logger;
  client: Pick<ISavedObjectsRepository, 'create' | 'update'>;
  configId: string;
  namespace: string | undefined;
  buildNum: number;
  preferenceAttributes: Record<string, string>;
}): Promise<void> {
  try {
    await client.update('config', configId, preferenceAttributes, { refresh: false, namespace });
    return;
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.warn(
        `${LOG_PREFIX} update() failed with non-404 error ${JSON.stringify({
          configId,
          errorMessage,
        })}`
      );
      throw error;
    }
  }

  try {
    await client.create(
      'config',
      { buildNum, ...preferenceAttributes },
      { id: configId, refresh: false, namespace }
    );
  } catch (error) {
    if (SavedObjectsErrorHelpers.isConflictError(error)) {
      await client.update('config', configId, preferenceAttributes, { refresh: false, namespace });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.warn(
      `${LOG_PREFIX} create() failed with non-conflict error ${JSON.stringify({
        configId,
        errorMessage,
      })}`
    );
    throw error;
  }
}
