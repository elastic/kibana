/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTelemetry, updateTelemetry } from './telemetry';

const elasticsearchPlugin: any = null;
const getSavedObjectsRepository: any = null;
const internalRepository = () => ({
  get: jest.fn(() => null),
  create: jest.fn(() => ({ attributes: 'test' })),
  update: jest.fn(() => ({ attributes: 'test' })),
});

function mockInit(getVal: any = { attributes: {} }): any {
  return {
    ...internalRepository(),
    get: jest.fn(() => getVal),
  };
}

describe('file upload plugin telemetry', () => {
  describe('getTelemetry', () => {
    it('should get existing telemetry', async () => {
      const internalRepo = mockInit();
      await getTelemetry(elasticsearchPlugin, getSavedObjectsRepository, internalRepo);
      expect(internalRepo.update.mock.calls.length).toBe(0);
      expect(internalRepo.get.mock.calls.length).toBe(1);
      expect(internalRepo.create.mock.calls.length).toBe(0);
    });
  });

  describe('updateTelemetry', () => {
    it('should update existing telemetry', async () => {
      const internalRepo = mockInit({
        attributes: {
          filesUploadedTotalCount: 2,
        },
      });

      await updateTelemetry({
        elasticsearchPlugin,
        getSavedObjectsRepository,
        internalRepo,
      });
      expect(internalRepo.update.mock.calls.length).toBe(1);
      expect(internalRepo.get.mock.calls.length).toBe(1);
      expect(internalRepo.create.mock.calls.length).toBe(0);
    });
  });
});
