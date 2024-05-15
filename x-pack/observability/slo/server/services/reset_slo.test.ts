/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';

import { SLO_MODEL_VERSION } from '../../common/constants';
import { createSLO } from './fixtures/slo';
import {
  createSLORepositoryMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
} from './mocks';
import { ResetSLO } from './reset_slo';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

const TEST_DATE = new Date('2023-01-01T00:00:00.000Z');

describe('ResetSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let loggerMock: jest.Mocked<MockedLogger>;
  let resetSLO: ResetSLO;

  beforeEach(() => {
    loggerMock = loggingSystemMock.createLogger();
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    resetSLO = new ResetSLO(
      mockEsClient,
      mockRepository,
      mockTransformManager,
      mockSummaryTransformManager,
      loggerMock,
      'some-space',
      httpServiceMock.createStartContract().basePath
    );
    jest.useFakeTimers().setSystemTime(TEST_DATE);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('resets all associated resources', async () => {
    const slo = createSLO({ id: 'irrelevant', version: 1 });
    mockRepository.findById.mockResolvedValueOnce(slo);
    mockRepository.save.mockImplementation((v) => Promise.resolve(v));

    await resetSLO.execute(slo.id);

    // delete existing resources and data
    expect(mockSummaryTransformManager.stop).toMatchSnapshot();
    expect(mockSummaryTransformManager.uninstall).toMatchSnapshot();

    expect(mockTransformManager.stop).toMatchSnapshot();
    expect(mockTransformManager.uninstall).toMatchSnapshot();

    expect(mockEsClient.deleteByQuery).toMatchSnapshot();

    // install resources
    expect(mockSummaryTransformManager.install).toMatchSnapshot();
    expect(mockSummaryTransformManager.start).toMatchSnapshot();

    expect(mockEsClient.ingest.putPipeline).toMatchSnapshot();

    expect(mockTransformManager.install).toMatchSnapshot();
    expect(mockTransformManager.start).toMatchSnapshot();

    expect(mockEsClient.index).toMatchSnapshot();

    expect(mockRepository.save).toHaveBeenCalledWith({
      ...slo,
      version: SLO_MODEL_VERSION,
      updatedAt: expect.anything(),
    });
  });
});
