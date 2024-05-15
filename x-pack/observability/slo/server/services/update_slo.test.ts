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
import { UpdateSLOParams } from '@kbn/slo-schema';
import { cloneDeep, omit, pick } from 'lodash';

import {
  getSLOSummaryTransformId,
  getSLOTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../common/constants';
import { SLO } from '../domain/models';
import { fiveMinute, oneMinute } from './fixtures/duration';
import {
  createAPMTransactionErrorRateIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from './fixtures/slo';
import { weeklyCalendarAligned } from './fixtures/time_window';
import {
  createSLORepositoryMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
} from './mocks';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';
import { UpdateSLO } from './update_slo';

describe('UpdateSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let loggerMock: jest.Mocked<MockedLogger>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let updateSLO: UpdateSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    loggerMock = loggingSystemMock.createLogger();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    updateSLO = new UpdateSLO(
      mockRepository,
      mockTransformManager,
      mockSummaryTransformManager,
      mockEsClient,
      loggerMock,
      'some-space',
      httpServiceMock.createStartContract().basePath
    );
  });

  describe('when the update payload does not change the original SLO', () => {
    function expectNoCallsToAnyMocks() {
      expect(mockTransformManager.stop).not.toBeCalled();
      expect(mockTransformManager.uninstall).not.toBeCalled();
      expect(mockTransformManager.install).not.toBeCalled();
      expect(mockTransformManager.start).not.toBeCalled();

      expect(mockSummaryTransformManager.stop).not.toBeCalled();
      expect(mockSummaryTransformManager.uninstall).not.toBeCalled();
      expect(mockSummaryTransformManager.install).not.toBeCalled();
      expect(mockSummaryTransformManager.start).not.toBeCalled();

      expect(mockEsClient.deleteByQuery).not.toBeCalled();
      expect(mockEsClient.ingest.putPipeline).not.toBeCalled();
    }

    it('returns early with a fully identical SLO payload', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = omit(cloneDeep(slo), [
        'id',
        'revision',
        'createdAt',
        'updatedAt',
        'version',
        'enabled',
      ]);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical name', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['name']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical indicator', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['indicator']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical timeWindow', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['timeWindow']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical budgetingMethod', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['budgetingMethod']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical description', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['description']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical groupBy', async () => {
      const slo = createSLO({ groupBy: 'project.id' });
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['groupBy']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical objective', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['objective']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical tags', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['tags']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical settings', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['settings']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });
  });

  describe('handles breaking changes', () => {
    it('consideres a settings change as a breaking change', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);

      const newSettings = { ...slo.settings, timestamp_field: 'newField' };
      await updateSLO.execute(slo.id, { settings: newSettings });

      expectDeletionOfOriginalSLOResources(slo);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...slo,
          settings: newSettings,
          revision: 2,
          updatedAt: expect.anything(),
        })
      );
      expectInstallationOfUpdatedSLOResources();
    });

    it('consideres a budgeting method change as a breaking change', async () => {
      const slo = createSLO({ budgetingMethod: 'occurrences' });
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        budgetingMethod: 'timeslices',
        objective: {
          target: slo.objective.target,
          timesliceTarget: 0.9,
          timesliceWindow: oneMinute(),
        },
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });

    it('consideres a timeWindow change as a breaking change', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        timeWindow: weeklyCalendarAligned(),
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });

    it('consideres a timeslice target change as a breaking change', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        objective: {
          target: slo.objective.target,
          timesliceTarget: 0.1,
          timesliceWindow: slo.objective.timesliceWindow,
        },
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });

    it('consideres a timeslice window change as a breaking change', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        objective: {
          target: slo.objective.target,
          timesliceTarget: slo.objective.timesliceTarget,
          timesliceWindow: fiveMinute(),
        },
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });

    it('consideres an indicator change as a breaking change', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        indicator: createAPMTransactionErrorRateIndicator(),
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });

    it('consideres a groupBy change as a breaking change', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        groupBy: 'new-field',
      });

      expectInstallationOfUpdatedSLOResources();
      expectDeletionOfOriginalSLOResources(slo);
    });
  });

  describe('when error happens during the update', () => {
    it('restores the previous SLO definition in the repository', async () => {
      const slo = createSLO({
        id: 'original-id',
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
      });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockTransformManager.install.mockRejectedValueOnce(new Error('Transform install error'));

      const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });

      await expect(updateSLO.execute(slo.id, { indicator: newIndicator })).rejects.toThrowError(
        'Transform install error'
      );

      expect(mockRepository.save).toHaveBeenCalledWith(slo);

      // these calls are related to the updated slo
      expect(mockSummaryTransformManager.stop).toMatchSnapshot();
      expect(mockSummaryTransformManager.uninstall).toMatchSnapshot();
      expect(mockTransformManager.stop).toMatchSnapshot();
      expect(mockTransformManager.uninstall).toMatchSnapshot();
      expect(mockEsClient.ingest.deletePipeline).toMatchSnapshot();
    });
  });

  function expectInstallationOfUpdatedSLOResources() {
    expect(mockTransformManager.install).toHaveBeenCalled();
    expect(mockTransformManager.start).toHaveBeenCalled();

    expect(mockEsClient.ingest.putPipeline).toHaveBeenCalled();

    expect(mockSummaryTransformManager.install).toHaveBeenCalled();
    expect(mockSummaryTransformManager.start).toHaveBeenCalled();

    expect(mockEsClient.index).toHaveBeenCalled();
  }

  function expectDeletionOfOriginalSLOResources(originalSlo: SLO) {
    const transformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
    expect(mockTransformManager.stop).toHaveBeenCalledWith(transformId);
    expect(mockTransformManager.uninstall).toHaveBeenCalledWith(transformId);

    const summaryTransformId = getSLOSummaryTransformId(originalSlo.id, originalSlo.revision);
    expect(mockSummaryTransformManager.stop).toHaveBeenCalledWith(summaryTransformId);
    expect(mockSummaryTransformManager.uninstall).toHaveBeenCalledWith(summaryTransformId);

    expect(mockEsClient.ingest.deletePipeline).toHaveBeenCalled();

    expect(mockEsClient.deleteByQuery).toHaveBeenCalledTimes(2);
    expect(mockEsClient.deleteByQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        index: SLO_DESTINATION_INDEX_PATTERN,
        query: {
          bool: {
            filter: [
              { term: { 'slo.id': originalSlo.id } },
              { term: { 'slo.revision': originalSlo.revision } },
            ],
          },
        },
      })
    );
    expect(mockEsClient.deleteByQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
        query: {
          bool: {
            filter: [
              { term: { 'slo.id': originalSlo.id } },
              { term: { 'slo.revision': originalSlo.revision } },
            ],
          },
        },
      })
    );
  }
});
