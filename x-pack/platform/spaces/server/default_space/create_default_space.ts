/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsRepository, SavedObjectsServiceStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import { DEFAULT_SPACE_ID } from '../../common/constants';

interface Deps {
  getSavedObjects: () => Promise<Pick<SavedObjectsServiceStart, 'createInternalRepository'>>;
  logger: Logger;
}

export async function createDefaultSpace({ getSavedObjects, logger }: Deps) {
  const { createInternalRepository } = await getSavedObjects();

  const savedObjectsRepository = createInternalRepository(['space']);

  logger.debug('Checking for existing default space');

  const defaultSpaceExists = await doesDefaultSpaceExist(savedObjectsRepository);

  if (defaultSpaceExists) {
    logger.debug('Default space already exists');
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

async function doesDefaultSpaceExist(savedObjectsRepository: Pick<SavedObjectsRepository, 'get'>) {
  try {
    await savedObjectsRepository.get('space', DEFAULT_SPACE_ID);
    return true;
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return false;
    }
    throw e;
  }
}
