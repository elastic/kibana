/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpdatableSavedObjectTypesMock } from './merge_service.test.mocks';
import {
  httpServerMock,
  savedObjectsClientMock,
  savedObjectsTypeRegistryMock,
} from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { tagsClientMock } from '../tags/tags_client.mock';
import { createTag } from '../../../common/test_utils';
import { taggableTypes, tagSavedObjectTypeName } from '../../../common/constants';
import { MergeError } from './errors';
import { MergeService } from './merge_service';

describe('MergeService', () => {
  let service: MergeService;
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let authorization: ReturnType<typeof securityMock.createSetup>['authz'];
  let typeRegistry: ReturnType<typeof savedObjectsTypeRegistryMock.create>;
  let tagsClient: ReturnType<typeof tagsClientMock.create>;

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
    authorization = securityMock.createSetup().authz;
    soClient = savedObjectsClientMock.create();
    typeRegistry = savedObjectsTypeRegistryMock.create();
    typeRegistry.getType.mockImplementation((type) => ({ name: type } as any));
    tagsClient = tagsClientMock.create();

    service = new MergeService({
      request,
      client: soClient,
      typeRegistry,
      tagsClient,
      authorization,
    });
  });

  afterEach(() => {
    getUpdatableSavedObjectTypesMock.mockReset();
  });

  describe('#normalizeFromIds', () => {
    it('dedupes and removes `toId`', () => {
      expect(service.normalizeFromIds('to', ['a', 'b', 'a', 'to'])).toEqual(['a', 'b']);
    });

    it('returns an empty array when only `toId` is provided', () => {
      expect(service.normalizeFromIds('to', ['to'])).toEqual([]);
    });
  });

  describe('#getUpdatableTaggableTypes', () => {
    it('calls `getUpdatableSavedObjectTypes` with the known taggable types', async () => {
      getUpdatableSavedObjectTypesMock.mockResolvedValue(['dashboard']);

      const result = await service.getUpdatableTaggableTypes();

      expect(getUpdatableSavedObjectTypesMock).toHaveBeenCalledWith({
        request,
        types: taggableTypes,
        authorization,
      });
      expect(result).toEqual(['dashboard']);
    });

    it('filters out types not registered in the type registry', async () => {
      typeRegistry.getType.mockImplementation((type) =>
        type === 'dashboard' ? ({ name: type } as any) : undefined
      );
      getUpdatableSavedObjectTypesMock.mockImplementation(({ types }) => Promise.resolve(types));

      const result = await service.getUpdatableTaggableTypes();

      expect(result).toEqual(['dashboard']);
    });
  });

  describe('#assertTagsNotManaged', () => {
    it('resolves when no tag is managed', async () => {
      tagsClient.get.mockImplementation((id) => Promise.resolve(createTag({ id, managed: false })));

      await expect(service.assertTagsNotManaged(['a', 'b'])).resolves.toBeUndefined();
    });

    it('throws a 400 MergeError naming the managed tag ids', async () => {
      tagsClient.get.mockImplementation((id) =>
        Promise.resolve(createTag({ id, managed: id === 'b' }))
      );

      const error = await service.assertTagsNotManaged(['a', 'b']).catch((e) => e);

      expect(error).toBeInstanceOf(MergeError);
      expect(error.message).toEqual('Managed tags cannot be merged: [b]');
      expect(error.status).toEqual(400);
    });
  });

  describe('#checkStartGate', () => {
    it('is allowed when the user can manage tags and this merge affects at least one object', async () => {
      getUpdatableSavedObjectTypesMock.mockResolvedValue([tagSavedObjectTypeName]);

      const result = await service.checkStartGate({ affectedCount: 1 });

      expect(result).toEqual({ allowed: true, reasons: [] });
    });

    it('is forbidden when the user cannot manage tag objects', async () => {
      getUpdatableSavedObjectTypesMock.mockResolvedValue([]);

      const result = await service.checkStartGate({ affectedCount: 1 });

      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('User cannot manage tag saved objects');
    });

    it('is forbidden when this merge would not affect any object the user can access', async () => {
      // even though the user can otherwise manage tags fine — a merge with 0 affected objects and
      // no source deletion is a pure no-op, whether because nothing is tagged, or because what is
      // tagged is outside this user's reach (`affectedCount` is already scoped to updatable types).
      getUpdatableSavedObjectTypesMock.mockResolvedValue([tagSavedObjectTypeName]);

      const result = await service.checkStartGate({ affectedCount: 0 });

      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain(
        'This merge would not update any saved objects you have permission to update'
      );
    });
  });

  describe('#checkDeleteSourcesGate', () => {
    it('is allowed (Gate 2a) when the user can update every type actually affected by this merge, even if that is not every taggable type registered in the deployment', async () => {
      // e.g. a dashboard-only editor can request deletion when only dashboards are affected,
      // even though they can't update every taggable type registered in the deployment
      // (`taggableTypes` has 10 entries; the user here can only update one of them).
      const result = await service.checkDeleteSourcesGate({
        updatableTypes: [taggableTypes[0]],
        affectedTypes: [taggableTypes[0]],
      });

      expect(result).toEqual({ allowed: true, reasons: [] });
      expect(taggableTypes.length).toBeGreaterThan(1);
    });

    it('is forbidden and names the affected types the user cannot update', async () => {
      const result = await service.checkDeleteSourcesGate({
        updatableTypes: [taggableTypes[0]],
        affectedTypes: [taggableTypes[0], taggableTypes[1]],
      });

      expect(result.allowed).toBe(false);
      expect(result.reasons[0]).toContain(taggableTypes[1]);
    });
  });

  describe('#getKnownTaggableTypes', () => {
    it('filters `taggableTypes` down to those registered in this deployment', () => {
      typeRegistry.getType.mockImplementation((type) =>
        type === taggableTypes[0] ? ({ name: type } as any) : undefined
      );

      expect(service.getKnownTaggableTypes()).toEqual([taggableTypes[0]]);
    });
  });

  describe('#computeAffectedCount / #findAffectedObjects', () => {
    it('delegates `computeAffectedCount` to the shared query primitive using the service client', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 3, page: 1, per_page: 0 });

      const result = await service.computeAffectedCount({ fromIds: ['a'], types: ['dashboard'] });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'dashboard', hasReferenceOperator: 'OR' })
      );
      expect(result).toEqual({ affectedCount: 3, byType: { dashboard: 3 } });
    });

    it('delegates `findAffectedObjects` to the shared query primitive using the service client', async () => {
      soClient.find.mockResolvedValue({
        saved_objects: [
          { id: 'obj-1', type: 'dashboard', references: [], attributes: {}, score: 0 },
        ],
        total: 1,
        page: 2,
        per_page: 10,
      });

      const result = await service.findAffectedObjects({
        fromIds: ['a'],
        types: ['dashboard'],
        page: 2,
        perPage: 10,
      });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ type: ['dashboard'], page: 2, perPage: 10 })
      );
      expect(result).toEqual({ total: 1, objects: [{ id: 'obj-1', type: 'dashboard' }] });
    });
  });
});
