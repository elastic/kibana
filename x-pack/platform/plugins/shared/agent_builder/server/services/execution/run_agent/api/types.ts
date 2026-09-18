/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import type { ApiRegistry, ApiRegistryMeta } from '@elastic/schemas/es/tools/types.js';
import { z } from '@kbn/zod/v4';
import { apiTargets } from '@kbn/agent-builder-common';

// The backend an API operation belongs to.
export const targetSchema = z.enum(apiTargets);

export const BODY_ROOT_KEY = 'x-body-root';

export type { ApiRegistry, ApiRegistryMeta };
export type LoadedApi = Awaited<ReturnType<ApiRegistry['loadApi']>>;
export type ApiRegistryDefinition = LoadedApi['definition'];
export type ApiRequest = ReturnType<LoadedApi['buildRequest']>;

/**
 * Narrows a value that came out of JSON (a schema document, a request body) to a plain object.
 *
 * @param value - The value to narrow.
 * @returns True when the value is a plain object rather than an array, a class instance, or a primitive.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);
