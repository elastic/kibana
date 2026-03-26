/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';

import type { ISavedObjectTypeRegistry } from '@kbn/core/server';

import { getImportTransformsFactory } from './access_control_transforms';

describe('Access Control Transforms', () => {
  // Mock type registry (expand to satisfy ISavedObjectTypeRegistry)
  const typeRegistry = {
    supportsAccessControl: (type: string) => type === 'dashboard',
  } as unknown as jest.Mocked<ISavedObjectTypeRegistry>;

  // Full AuthenticatedUser mock
  // const makeUser = (profileUid: string | null): AuthenticatedUser | null =>
  //   profileUid
  //     ? {
  //         username: profileUid,
  //         profile_uid: profileUid,
  //         authentication_realm: { name: '', type: '' },
  //         lookup_realm: { name: '', type: '' },
  //         authentication_provider: { name: 'basic', type: 'basic' },
  //         authentication_type: 'basic',
  //         roles: [],
  //         enabled: true,
  //         elastic_cloud_user: false,
  //       }
  //     : null;

  // describe('exportTransform', () => {
  //   it('strips the owner field for all objects that contain access control metadata', () => {
  //     const objects = [
  //       {
  //         type: 'a',
  //         id: 'id_1',
  //         attributes: {},
  //         references: [],
  //         accessControl: { accessMode: 'read_only' as const, owner: 'alice' },
  //       },
  //       {
  //         type: 'b',
  //         id: 'id_2',
  //         attributes: {},
  //         references: [],
  //         accessControl: { accessMode: 'read_only' as const, owner: 'alice' },
  //       },
  //       {
  //         type: 'c',
  //         id: 'id_3',
  //         attributes: {},
  //         references: [],
  //       },
  //       {
  //         type: 'd',
  //         id: 'id_4',
  //         attributes: {},
  //         references: [],
  //         accessControl: { accessMode: 'read_only' as const, owner: 'bob' },
  //       },
  //     ];

  //     const result = exportTransform({ request }, objects);
  //     expect(result).toEqual(
  //       objects.map((obj) => ({
  //         ...obj,
  //         ...(obj.accessControl && { accessControl: { ...obj.accessControl, owner: '' } }),
  //       }))
  //     );
  //   });
  // });

  describe('getImportTransformsFactory', () => {
    it(`returns a function that creates the import transforms`, () => {
      const createImportTransforms = getImportTransformsFactory();
      expect(createImportTransforms).toBeInstanceOf(Function);
      const importTransforms = createImportTransforms(typeRegistry, []);
      expect(importTransforms).toHaveProperty('mapStream');
      expect(importTransforms).toHaveProperty('filterStream');
      expect(importTransforms.mapStream).toBeInstanceOf(Transform);
      expect(importTransforms.filterStream).toBeInstanceOf(Transform);
    });
  });
});
