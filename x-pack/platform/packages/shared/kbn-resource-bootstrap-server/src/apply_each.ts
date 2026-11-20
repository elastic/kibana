/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toApplyError } from './to_apply_error';
import type { ApplyError, ApplyResult } from './types';

/** Why a resource was not applied; `applyEach` adds its id. */
export type ApplyErrorDetails = Omit<ApplyError, 'id'>;

/**
 * Writes each resource in turn and reports the ones that fail under their id. The signal is checked
 * before each write, so an abort stops the run instead of failing the resource that was next.
 */
export const applyEach = async <TResource>({
  resources,
  signal,
  idOf,
  write,
  describeError = toApplyError,
}: {
  resources: readonly TResource[];
  signal: AbortSignal;
  idOf: (resource: TResource) => string;
  /** Returns the details of a resource it refuses without throwing, such as an invalid declaration. */
  write: (resource: TResource) => Promise<ApplyErrorDetails | void>;
  /** Describes an error `write` threw; defaults to `toApplyError`. */
  describeError?: (
    error: unknown,
    resource: TResource
  ) => ApplyErrorDetails | Promise<ApplyErrorDetails>;
}): Promise<ApplyResult> => {
  let applied = 0;
  const errors: ApplyError[] = [];

  for (const resource of resources) {
    // Outside the try, so an abort stops the run instead of failing this resource.
    signal.throwIfAborted();
    const id = idOf(resource);
    try {
      const refused = await write(resource);
      if (refused) {
        errors.push({ id, ...refused });
        continue;
      }
      applied++;
    } catch (error) {
      errors.push({ id, ...(await describeError(error, resource)) });
    }
  }

  return { applied, errors };
};
