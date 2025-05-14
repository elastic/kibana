/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

/**
 * Symbol to use on created internal saved object client that stores information about the client
 * (see `SavedObjectClientInfo` type below).
 *
 * ### Why?
 * When working with internal SO Client (no security extension) it is currently difficult to
 * determine if a client was also initiated without the spaces extension (un-scoped), especially
 * if trying to determine if it is currently meant to be operating on the `default` space. This
 * property can be added SO client to store additional information about it, which Fleet can then
 * retrieve (when space awareness is enabled) to determine how to operate with the so client.
 *
 * @example
 *
 * const soClient = savedObjectsServiceStart.getScopedClient(
 *    fakeHttpRequest,
 *    {
 *      excludedExtensions: [SECURITY_EXTENSION_ID, SPACES_EXTENSION_ID]
 *    }
 * );
 *
 * Object.defineProperty(
 *    soClient,
 *    INTERNAL_SAVED_OBJECT_CLIENT_INFO,
 *    {
 *      value: {
 *        isUnScoped: true,
 *        spaceId: `default`
 *      }
 *    }
 * );
 *
 */
export const INTERNAL_SAVED_OBJECT_CLIENT_INFO = Symbol('internal saved object client info');

export interface SavedObjectClientInfo<T extends any = unknown> {
  /**
   * Indicates that the saved object client is not scoped to any space
   * (was initialized **WITHOUT** the spaces extension)
   * */
  isUnScoped: boolean;

  /** The space id that the saved object client was initiated with. */
  spaceId: string | undefined;

  /**
   * Any additional data for use in initiated context
   */
  meta?: T;
}

/**
 * Sets a property on the provided soClient that stores information about the client
 *
 * @param soClient
 * @param info
 */
export const setSoClientInfo = <T>(
  soClient: SavedObjectsClientContract,
  info: SavedObjectClientInfo<T>
): void => {
  if (INTERNAL_SAVED_OBJECT_CLIENT_INFO in soClient) {
    return;
  }

  Object.defineProperty(soClient, INTERNAL_SAVED_OBJECT_CLIENT_INFO, {
    value: info,
  });
};

/**
 * Returns information about the Saved Object client if available
 * @param soClient
 */
export const getSoClientInfo = <T>(
  soClient: SavedObjectsClientContract
): SavedObjectClientInfo<T> | undefined => {
  if (INTERNAL_SAVED_OBJECT_CLIENT_INFO in soClient) {
    return soClient[INTERNAL_SAVED_OBJECT_CLIENT_INFO] as SavedObjectClientInfo<T>;
  }
};
