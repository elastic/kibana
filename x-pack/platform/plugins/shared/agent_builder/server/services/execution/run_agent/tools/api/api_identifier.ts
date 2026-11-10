/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Builds the `api` identifier parameter shared by the describe and execute API tools.
 *
 * @param discoveryEnabled - Whether the discovery tool is available. When it is not, the
 * description restricts the identifier to one a skill or the user supplied.
 * @returns The schema for the `api` parameter.
 */
export const createApiIdentifierSchema = (discoveryEnabled: boolean): z.ZodString => {
  const format =
    'The API identifier, formed from the namespace and name (e.g. "indices.create", "bulk", ' +
    '"cluster.health").';

  return z
    .string()
    .describe(
      discoveryEnabled
        ? format
        : `${format} Must be an identifier a skill or the user gave you. Never a guessed or ` +
            'remembered one.'
    );
};
