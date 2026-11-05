/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiKeys } from './api_keys';

/**
 * How a plugin stores {@link ApiKeys} in its own saved object attributes. `read(write(keys))`
 * must return `keys`, which `describeApiKeyStorage` in `@kbn/response-ops-api-keys-test-helpers`
 * checks for every plugin.
 */
export interface ApiKeyStorage<Attributes> {
  write(keys: ApiKeys): Attributes;
  /** Returns `undefined` when the attributes hold no API key. */
  read(attributes: Attributes): ApiKeys | undefined;
}

export const defineApiKeyStorage = <Attributes>(
  storage: ApiKeyStorage<Attributes>
): ApiKeyStorage<Attributes> => storage;
