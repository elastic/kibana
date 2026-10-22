/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lazySchema, z } from '@kbn/zod/v4';

/** Caps of the resources of a connection: they travel in the query string and reach an ES `terms` filter. */
export const MAX_CONNECTION_RESOURCES = 100;
const MAX_RESOURCE_LENGTH = 512;

/**
 * `span.destination.service.resource` values of a connection. A query string with a single
 * value arrives as a string, so it is normalized to an array.
 */
export const connectionDependenciesSchema = lazySchema(() =>
  z
    .union([
      z.string().max(MAX_RESOURCE_LENGTH),
      z.array(z.string().max(MAX_RESOURCE_LENGTH)).max(MAX_CONNECTION_RESOURCES),
    ])
    .transform((dependencies) => (Array.isArray(dependencies) ? dependencies : [dependencies]))
);
