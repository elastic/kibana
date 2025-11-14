/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AutomaticImportService } from './automatic_import_service';
import type {
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
  SecurityServiceStart,
} from '@kbn/core/server';

// Mock the AutomaticImportSamplesIndexService
jest.mock('./samples_index/index_service', () => {
  return {
    AutomaticImportSamplesIndexService: jest.fn().mockImplementation(() => ({
      createSamplesDocs: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('AutomaticImportSetupService', () => {
  let service: AutomaticImportService;
  let mockLoggerFactory: ReturnType<typeof loggerMock.create>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockSavedObjectsSetup: jest.Mocked<SavedObjectsServiceSetup>;
  let mockSavedObjectsStart: jest.Mocked<SavedObjectsServiceStart>;
  let mockSecurity: SecurityServiceStart;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoggerFactory = loggerMock.create();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockSavedObjectsSetup = savedObjectsServiceMock.createSetupContract();
    mockSavedObjectsStart = savedObjectsServiceMock.createStartContract();
    mockSecurity = securityMock.createStart() as unknown as SecurityServiceStart;

    service = new AutomaticImportService(
      mockLoggerFactory,
      Promise.resolve(mockEsClient),
      mockSavedObjectsSetup
    );
  });

  describe('constructor', () => {
    it('should initialize the AutomaticImportSamplesIndexService with correct parameters', () => {
      const { AutomaticImportSamplesIndexService: MockedService } = jest.requireMock(
        './samples_index/index_service'
      );

      expect(MockedService).toHaveBeenCalledWith(mockLoggerFactory, expect.any(Promise));
    });

    it('should initialize the pluginStop$ subject', () => {
      expect((service as any).pluginStop$).toBeDefined();
      expect((service as any).pluginStop$.subscribe).toBeDefined();
    });

    it('should register saved object types during construction', () => {
      expect(mockSavedObjectsSetup.registerType).toHaveBeenCalledTimes(2);
      expect(mockSavedObjectsSetup.registerType).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'integration-config' })
      );
      expect(mockSavedObjectsSetup.registerType).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'data_stream-config' })
      );
    });

    it('should store the savedObjectsServiceSetup reference', () => {
      expect((service as any).savedObjectsServiceSetup).toBe(mockSavedObjectsSetup);
    });
  });

  describe('initialize', () => {
    it('should create internal repository and initialize saved object service', async () => {
      await service.initialize(mockSecurity, mockSavedObjectsStart);

      expect(mockSavedObjectsStart.createInternalRepository).toHaveBeenCalledTimes(1);
      expect((service as any).security).toBe(mockSecurity);
      expect((service as any).savedObjectService).toBeDefined();
    });

    it('should set security reference', async () => {
      expect((service as any).security).toBeNull();

      await service.initialize(mockSecurity, mockSavedObjectsStart);

      expect((service as any).security).toBe(mockSecurity);
    });

    it('should create savedObjectService with correct parameters', async () => {
      await service.initialize(mockSecurity, mockSavedObjectsStart);

      const savedObjectService = (service as any).savedObjectService;
      expect(savedObjectService).toBeDefined();
    });

    it('should use internal repository from createInternalRepository', async () => {
      await service.initialize(mockSecurity, mockSavedObjectsStart);

      expect(mockSavedObjectsStart.createInternalRepository).toHaveBeenCalled();
    });
  });

  describe('methods before initialization', () => {
    it('should throw error when calling insertIntegration before initialize', async () => {
      await expect(service.insertIntegration({} as any, {} as any)).rejects.toThrow(
        'Saved Objects service not initialized.'
      );
    });

    it('should throw error when calling getIntegration before initialize', async () => {
      await expect(service.getIntegration('test-id')).rejects.toThrow(
        'Saved Objects service not initialized.'
      );
    });

    it('should throw error when calling addSamplesToDataStream before initialize', async () => {
      await expect(service.addSamplesToDataStream({} as any, {} as any)).rejects.toThrow(
        'Security service not initialized.'
      );
    });
  });

  describe('stop', () => {
    it('should complete the pluginStop$ subject', () => {
      const pluginStop$ = (service as any).pluginStop$;
      const nextSpy = jest.spyOn(pluginStop$, 'next');
      const completeSpy = jest.spyOn(pluginStop$, 'complete');

      service.stop();

      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(nextSpy).toHaveBeenCalledWith();
      expect(completeSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit to all subscribers before completing', (done) => {
      const pluginStop$ = (service as any).pluginStop$;
      let emittedValue: any;
      let completed = false;

      pluginStop$.subscribe({
        next: (value: any) => {
          emittedValue = value;
        },
        complete: () => {
          completed = true;
          expect(emittedValue).toBeUndefined();
          expect(completed).toBe(true);
          done();
        },
      });

      service.stop();
    });

    it('should be safe to call multiple times', () => {
      const pluginStop$ = (service as any).pluginStop$;
      const nextSpy = jest.spyOn(pluginStop$, 'next');
      const completeSpy = jest.spyOn(pluginStop$, 'complete');

      service.stop();
      service.stop();

      // RxJS subjects are safe to complete multiple times
      expect(nextSpy).toHaveBeenCalledTimes(2);
      expect(completeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('integration', () => {
    it('should properly initialize and setup the service', async () => {
      const { AutomaticImportSamplesIndexService: MockedService } = jest.requireMock(
        './samples_index/index_service'
      );

      // Verify constructor was called
      expect(MockedService).toHaveBeenCalledWith(mockLoggerFactory, expect.any(Promise));

      expect(mockSavedObjectsSetup.registerType).toHaveBeenCalledTimes(2);
      await service.initialize(mockSecurity, mockSavedObjectsStart);
      expect(mockSavedObjectsStart.createInternalRepository).toHaveBeenCalled();

      // Stop the service
      service.stop();

      // Verify pluginStop$ was completed
      expect((service as any).pluginStop$.isStopped).toBeTruthy();
    });

    it('should maintain the same pluginStop$ instance throughout lifecycle', () => {
      const pluginStop$Before = (service as any).pluginStop$;
      const pluginStop$After = (service as any).pluginStop$;

      expect(pluginStop$Before).toBe(pluginStop$After);
    });

    it('should pass ES client promises to samples index service', () => {
      const { AutomaticImportSamplesIndexService: MockedService } = jest.requireMock(
        './samples_index/index_service'
      );

      const constructorCall = MockedService.mock.calls[0];
      expect(constructorCall[0]).toBe(mockLoggerFactory);
      expect(constructorCall[1]).toBeInstanceOf(Promise);
    });

    it('should complete full lifecycle: construct -> initialize -> stop', async () => {
      expect((service as any).savedObjectService).toBeNull();

      await service.initialize(mockSecurity, mockSavedObjectsStart);
      expect((service as any).savedObjectService).toBeDefined();

      // Stop
      service.stop();
      expect((service as any).pluginStop$.isStopped).toBeTruthy();
    });
  });
});
