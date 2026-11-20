/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { Logger } from '@kbn/logging';

/** Resolves `undefined` when the lookup fails. */
export type SpaceExists = (spaceId: string) => Promise<boolean | undefined>;

/**
 * Wraps the lookup the `space` kind gives, since the spaces plugin depends on this one. Without it,
 * as when the spaces plugin is disabled, which only dev mode allows, only `default` exists.
 */
export const createSpaceExists = (
  lookup: ((spaceId: string) => Promise<boolean>) | undefined,
  logger: Logger
): SpaceExists => {
  let warnedSpacesDisabled = false;
  return async (spaceId) => {
    if (spaceId === DEFAULT_SPACE_ID) {
      return true;
    }
    if (!lookup) {
      // Once, so the warning for each missing space is not taken for a typo.
      if (!warnedSpacesDisabled) {
        warnedSpacesDisabled = true;
        logger.warn(
          `The spaces plugin is disabled, so only the "${DEFAULT_SPACE_ID}" space exists and resources applied into other spaces cannot be seen`
        );
      }
      return false;
    }
    try {
      return await lookup(spaceId);
    } catch {
      return undefined;
    }
  };
};
