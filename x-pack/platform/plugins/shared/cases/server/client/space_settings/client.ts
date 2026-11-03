/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { CASES_SPACE_SETTINGS_ID } from '../../../common/constants';
import type { CasesSpaceSettings } from '../../../common/types/domain/space_settings/v1';
import { CasesSpaceSettingsSchema } from '../../../common/types/domain/space_settings/v1';
import { getEffectiveStatuses, validateStatuses } from '../../../common/utils/statuses';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import {
  CUSTOM_STATUSES_DISABLED_MESSAGE,
  isCustomStatusesEnabled,
} from '../../common/custom_statuses';
import type { CasesClientArgs } from '../types';

/**
 * API for the Cases settings that apply to a whole space, whichever solution owns the case.
 */
export interface SpaceSettingsSubClient {
  /** The space's settings; statuses fall back to the seeded defaults. */
  get(): Promise<CasesSpaceSettings>;
  update(settings: CasesSpaceSettings): Promise<CasesSpaceSettings>;
}

export const createSpaceSettingsSubClient = (
  clientArgs: CasesClientArgs
): SpaceSettingsSubClient => {
  const {
    services: { spaceSettingsService },
    authorization,
    logger,
  } = clientArgs;

  const get = async (): Promise<CasesSpaceSettings> => {
    try {
      // Every Cases user renders statuses, so reading needs no more than reading any owner's
      // configuration, which comes with read access to cases.
      await authorization.getAuthorizationFilter(Operations.findConfigurations);
      return { statuses: await spaceSettingsService.getStatuses() };
    } catch (error) {
      throw createCaseError({
        message: `Failed to get the cases space settings: ${error}`,
        error,
        logger,
      });
    }
  };

  const update = async (settings: CasesSpaceSettings): Promise<CasesSpaceSettings> => {
    try {
      if (!isCustomStatusesEnabled()) {
        throw Boom.badRequest(CUSTOM_STATUSES_DISABLED_MESSAGE);
      }

      const { statuses } = decodeWithExcessOrThrowZod(CasesSpaceSettingsSchema)(settings);

      // The statuses apply to the cases of every solution in the space, so changing them needs
      // the settings privilege of each of them.
      const owners = authorization.getSpaceOwners();
      if (owners.length === 0) {
        throw Boom.forbidden('Unauthorized to update the cases space settings');
      }
      await authorization.ensureAuthorized({
        operation: Operations.updateConfiguration,
        entities: owners.map((owner) => ({ owner, id: CASES_SPACE_SETTINGS_ID })),
      });

      const previous = await spaceSettingsService.getStatuses();
      const errors = validateStatuses(statuses, previous);
      if (errors.length > 0) {
        throw Boom.badRequest(errors.join(' '));
      }

      const saved = await spaceSettingsService.put({ statuses });
      return { statuses: getEffectiveStatuses(saved) };
    } catch (error) {
      throw createCaseError({
        message: `Failed to update the cases space settings: ${error}`,
        error,
        logger,
      });
    }
  };

  return { get, update };
};
