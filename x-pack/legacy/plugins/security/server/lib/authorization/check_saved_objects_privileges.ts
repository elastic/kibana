/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { SpacesPlugin } from '../../../../spaces';
import { OptionalPlugin } from '../../../../../server/lib/optional_plugin';
import { CheckPrivilegesAtResourceResponse, CheckPrivilegesWithRequest } from './check_privileges';

export type CheckSavedObjectsPrivilegesWithRequest = (
  request: Legacy.Request
) => CheckSavedObjectsPrivileges;
export type CheckSavedObjectsPrivileges = (
  actions: string | string[],
  namespace?: string
) => Promise<CheckPrivilegesAtResourceResponse>;

export const checkSavedObjectsPrivilegesWithRequestFactory = (
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest,
  spaces: OptionalPlugin<SpacesPlugin>
): CheckSavedObjectsPrivilegesWithRequest => {
  return function checkSavedObjectsPrivilegesWithRequest(request: Legacy.Request) {
    return async function checkSavedObjectsPrivileges(
      actions: string | string[],
      namespace?: string
    ) {
      if (spaces.isEnabled) {
        return checkPrivilegesWithRequest(request).atSpace(
          spaces.namespaceToSpaceId(namespace),
          actions
        );
      }
      return checkPrivilegesWithRequest(request).globally(actions);
    };
  };
};
