/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthorizationTypeEntry, AuthorizationTypeMap } from '@kbn/core-saved-objects-server';

/**
 * Helper function that, given an `CheckAuthorizationResult`, checks to see what spaces the user is authorized to perform a given action for
 * the given object type.
 *
 * Only exported for unit testing purposes.
 *
 * @param {string} objectType the object type to check.
 * @param {T} action the action to check.
 * @param {AuthorizationTypeMap<A>} typeMap the typeMap from an CheckAuthorizationResult.
 */
export function getEnsureAuthorizedActionResult<A extends string>(
  objectType: string,
  action: A,
  typeMap: AuthorizationTypeMap<A>
): AuthorizationTypeEntry {
  const record = typeMap.get(objectType) ?? ({} as Record<A, AuthorizationTypeEntry>);
  return record[action] ?? { authorizedSpaces: [] };
}

/**
 * Helper function that, given an `CheckAuthorizationResult`, ensures that the user is authorized to perform a given action for the given
 * object type in the given spaces.
 *
 * @param objectType The object type to check.
 * @param action The action to check.
 * @param spaces The spaces to check.
 * @param typeMap The typeMap from a CheckAuthorizationResult.
 */
export function isAuthorizedInAllSpaces<T extends string>(
  objectType: string,
  action: T,
  spaces: string[],
  typeMap: AuthorizationTypeMap<T>
) {
  const actionResult = getEnsureAuthorizedActionResult(objectType, action, typeMap);
  const { authorizedSpaces, isGloballyAuthorized } = actionResult;
  const authorizedSpacesSet = new Set(authorizedSpaces);
  return isGloballyAuthorized || spaces.every((space) => authorizedSpacesSet.has(space));
}
