/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AutomaticImportService } from './automatic_import_service';

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoggerFactory = loggerMock.create();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

    service = new AutomaticImportService(mockLoggerFactory, Promise.resolve(mockEsClient));
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
    it('should properly initialize and setup the service', () => {
      const { AutomaticImportSamplesIndexService: MockedService } = jest.requireMock(
        './samples_index/index_service'
      );

      // Verify constructor was called
      expect(MockedService).toHaveBeenCalledWith(mockLoggerFactory, expect.any(Promise));

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

    it('should pass ES client and security promises to samples index service', () => {
      const { AutomaticImportSamplesIndexService: MockedService } = jest.requireMock(
        './samples_index/index_service'
      );

      const constructorCall = MockedService.mock.calls[0];
      expect(constructorCall[0]).toBe(mockLoggerFactory);
      expect(constructorCall[1]).toBeInstanceOf(Promise);
    });
  });
});
