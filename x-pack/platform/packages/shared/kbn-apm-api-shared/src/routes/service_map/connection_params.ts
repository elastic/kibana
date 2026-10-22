/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lazySchema, z } from '@kbn/zod/v4';

/**
 * `span.destination.service.resource` values of a connection. A query string with a single
 * value arrives as a string, so it is normalized to an array.
 */
export const connectionDependenciesSchema = lazySchema(() =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((dependencies) => (Array.isArray(dependencies) ? dependencies : [dependencies]))
);
