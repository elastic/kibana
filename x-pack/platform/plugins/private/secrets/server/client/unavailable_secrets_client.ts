/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecretsUnavailableError } from '@kbn/secrets';
import type { SecretsClient } from './types';

export interface CreateUnavailableSecretsClientParams {
  /** Why secrets cannot be used, and what fixes it. Becomes the message of every error. */
  readonly reason: string;
}

/** Creates a secrets client whose every operation throws `SecretsUnavailableError`. */
export const createUnavailableSecretsClient = ({
  reason,
}: CreateUnavailableSecretsClientParams): SecretsClient => {
  const fail = async (): Promise<never> => {
    throw new SecretsUnavailableError(reason);
  };
  return {
    list: fail,
    create: fail,
    update: fail,
    delete: fail,
  };
};
