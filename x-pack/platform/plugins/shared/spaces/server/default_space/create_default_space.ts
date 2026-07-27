/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsRepository, SavedObjectsServiceStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SolutionId } from '@kbn/core-chrome-browser';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { i18n } from '@kbn/i18n';

interface Deps {
  getSavedObjects: () => Promise<Pick<SavedObjectsServiceStart, 'createInternalRepository'>>;
  logger: Logger;
  solution?: SolutionId;
  /**
   * When running in development mode, align the (existing) default space's
   * solution view with the configured default solution. This makes a freshly
   * loaded dev environment land on the intended solution (e.g. Observability)
   * even when the default space was created by an earlier run. Deliberate,
   * non-classic solution choices are left untouched.
   */
  dev?: boolean;
}

export async function createDefaultSpace({ getSavedObjects, logger, solution, dev }: Deps) {
  const { createInternalRepository } = await getSavedObjects();

  const savedObjectsRepository = createInternalRepository(['space']);

  logger.debug('Checking for existing default space');

  const existingDefaultSpace = await getDefaultSpace(savedObjectsRepository);

  if (existingDefaultSpace) {
    logger.debug('Default space already exists');

    if (dev && solution) {
      const currentSolution = existingDefaultSpace.attributes?.solution;
      const canBackfill = !currentSolution || currentSolution === 'classic';
      if (canBackfill && currentSolution !== solution) {
        logger.debug(`Defaulting existing default space solution view to "${solution}" (dev)`);
        await savedObjectsRepository.update('space', DEFAULT_SPACE_ID, { solution });
      }
    }

    return;
  }

  const options = {
    id: DEFAULT_SPACE_ID,
  };

  logger.debug('Creating the default space');
  try {
    await savedObjectsRepository.create(
      'space',
      {
        name: i18n.translate('xpack.spaces.defaultSpaceTitle', {
          defaultMessage: 'Default',
        }),
        description: i18n.translate('xpack.spaces.defaultSpaceDescription', {
          defaultMessage: 'This is your default space!',
        }),
        color: '#00bfb3',
        disabledFeatures: [],
        _reserved: true,
        ...(solution ? { solution } : {}),
      },
      options
    );
  } catch (error) {
    // Ignore conflict errors.
    // It is possible that another Kibana instance, or another invocation of this function
    // created the default space in the time it took this to complete.
    if (SavedObjectsErrorHelpers.isConflictError(error)) {
      return;
    }
    throw error;
  }

  logger.debug('Default space created');
}

async function getDefaultSpace(savedObjectsRepository: Pick<SavedObjectsRepository, 'get'>) {
  try {
    return await savedObjectsRepository.get<{ solution?: SolutionId }>('space', DEFAULT_SPACE_ID);
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return null;
    }
    throw e;
  }
}
