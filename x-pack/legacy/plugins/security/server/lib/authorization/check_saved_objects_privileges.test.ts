/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesPlugin } from '../../../../spaces';
import { OptionalPlugin } from '../../../../../server/lib/optional_plugin';
import { checkSavedObjectsPrivilegesWithRequestFactory } from './check_saved_objects_privileges';

test(`checkPrivileges.atSpace when spaces is enabled`, async () => {
  const expectedResult = Symbol();
  const spaceId = 'foo-space';
  const mockCheckPrivileges = {
    atSpace: jest.fn().mockReturnValue(expectedResult),
  };
  const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);

  const mockSpaces = ({
    isEnabled: true,
    namespaceToSpaceId: jest.fn().mockReturnValue(spaceId),
  } as unknown) as OptionalPlugin<SpacesPlugin>;
  const request = Symbol();

  const privilegeOrPrivileges = ['foo', 'bar'];

  const checkSavedObjectsPrivileges = checkSavedObjectsPrivilegesWithRequestFactory(
    mockCheckPrivilegesWithRequest,
    mockSpaces
  )(request as any);

  const namespace = 'foo';

  const result = await checkSavedObjectsPrivileges(privilegeOrPrivileges, namespace);

  expect(result).toBe(expectedResult);
  expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
  expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, privilegeOrPrivileges);
  expect(mockSpaces.namespaceToSpaceId).toBeCalledWith(namespace);
});

test(`checkPrivileges.globally when spaces is disabled`, async () => {
  const expectedResult = Symbol();
  const mockCheckPrivileges = {
    globally: jest.fn().mockReturnValue(expectedResult),
  };
  const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
  const mockSpaces = ({
    isEnabled: false,
    namespaceToSpaceId: jest.fn().mockImplementation(() => {
      throw new Error('should not be called');
    }),
  } as unknown) as OptionalPlugin<SpacesPlugin>;

  const request = Symbol();

  const privilegeOrPrivileges = ['foo', 'bar'];

  const checkSavedObjectsPrivileges = checkSavedObjectsPrivilegesWithRequestFactory(
    mockCheckPrivilegesWithRequest,
    mockSpaces
  )(request as any);

  const namespace = 'foo';

  const result = await checkSavedObjectsPrivileges(privilegeOrPrivileges, namespace);

  expect(result).toBe(expectedResult);
  expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
  expect(mockCheckPrivileges.globally).toHaveBeenCalledWith(privilegeOrPrivileges);
  expect(mockSpaces.namespaceToSpaceId).not.toHaveBeenCalled();
});
