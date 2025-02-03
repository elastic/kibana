/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { SavedObjectsApiService } from '../services/ml_api_service/saved_objects';
import type { TrainedModelsApiService } from '../services/ml_api_service/trained_models';
import type { ModelDeploymentParams } from './trained_models_service';
import { TrainedModelsService } from './trained_models_service';
import type { TrainedModelUIItem } from '../../../common/types/trained_models';
import { MODEL_STATE } from '@kbn/ml-trained-models-utils';
import { i18n } from '@kbn/i18n';
import type { MlTrainedModelConfig } from '@elastic/elasticsearch/lib/api/types';

// Helper that resolves on the next microtask tick
const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('TrainedModelsService', () => {
  let mockTrainedModelsApiService: jest.Mocked<TrainedModelsApiService>;
  let mockSavedObjectsApiService: jest.Mocked<SavedObjectsApiService>;
  let trainedModelsService: TrainedModelsService;
  let scheduledDeploymentsSubject: BehaviorSubject<ModelDeploymentParams[]>;
  let mockSetScheduledDeployments: jest.Mock<any, any>;

  const mockDisplayErrorToast = jest.fn();
  const mockDisplaySuccessToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    scheduledDeploymentsSubject = new BehaviorSubject<ModelDeploymentParams[]>([]);
    mockSetScheduledDeployments = jest.fn((deployments: ModelDeploymentParams[]) => {
      scheduledDeploymentsSubject.next(deployments);
    });

    mockTrainedModelsApiService = {
      getTrainedModelsList: jest.fn(),
      installElasticTrainedModelConfig: jest.fn(),
      stopModelAllocation: jest.fn(),
      startModelAllocation: jest.fn(),
      updateModelDeployment: jest.fn(),
      getModelsDownloadStatus: jest.fn(),
    } as unknown as jest.Mocked<TrainedModelsApiService>;

    mockSavedObjectsApiService = {
      trainedModelsSpaces: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsApiService>;

    trainedModelsService = new TrainedModelsService(mockTrainedModelsApiService);
    trainedModelsService.init({
      scheduledDeployments$: scheduledDeploymentsSubject,
      setScheduledDeployments: mockSetScheduledDeployments,
      displayErrorToast: mockDisplayErrorToast,
      displaySuccessToast: mockDisplaySuccessToast,
      savedObjectsApiService: mockSavedObjectsApiService,
      canManageSpacesAndSavedObjects: true,
    });

    mockTrainedModelsApiService.getTrainedModelsList.mockResolvedValue([]);
    mockSavedObjectsApiService.trainedModelsSpaces.mockResolvedValue({
      trainedModels: {},
    });
  });

  afterEach(() => {
    trainedModelsService.destroy();
  });

  it('initializes and fetched models successfully', () => {
    const mockModels: TrainedModelUIItem[] = [
      {
        model_id: 'test-model-1',
        state: MODEL_STATE.DOWNLOADED,
      } as unknown as TrainedModelUIItem,
    ];

    mockTrainedModelsApiService.getTrainedModelsList.mockResolvedValue(mockModels);
    mockSavedObjectsApiService.trainedModelsSpaces.mockResolvedValue({
      trainedModels: {
        'test-model-1': ['default'],
      },
    });

    const sub = trainedModelsService.modelItems$.subscribe((items) => {
      if (items.length > 0) {
        expect(items[0].model_id).toBe('test-model-1');
        expect(mockTrainedModelsApiService.getTrainedModelsList).toHaveBeenCalledTimes(1);
        sub.unsubscribe();
      }
    });

    trainedModelsService.fetchModels();
  });

  it('handles fetchModels error', async () => {
    const error = new Error('Fetch error');
    mockTrainedModelsApiService.getTrainedModelsList.mockRejectedValueOnce(error);

    trainedModelsService.fetchModels();
    await flushPromises();

    expect(mockDisplayErrorToast).toHaveBeenCalledWith(
      error,
      i18n.translate('xpack.ml.trainedModels.modelsList.fetchFailedErrorMessage', {
        defaultMessage: 'Error loading trained models',
      })
    );
  });

  it('downloads a model successfully', async () => {
    mockTrainedModelsApiService.installElasticTrainedModelConfig.mockResolvedValueOnce({
      model_id: 'my-model',
    } as unknown as MlTrainedModelConfig);

    trainedModelsService.downloadModel('my-model');

    expect(mockTrainedModelsApiService.installElasticTrainedModelConfig).toHaveBeenCalledWith(
      'my-model'
    );
  });

  it('handles download model error', async () => {
    const mockError = new Error('Download failed');
    mockTrainedModelsApiService.installElasticTrainedModelConfig.mockRejectedValueOnce(mockError);

    trainedModelsService.downloadModel('failing-model');
    await flushPromises();

    expect(mockDisplayErrorToast).toHaveBeenCalledWith(
      mockError,
      i18n.translate('xpack.ml.trainedModels.modelsList.downloadFailed', {
        defaultMessage: 'Failed to download "{modelId}"',
        values: { modelId: 'failing-model' },
      })
    );
  });

  it('stops model deployment successfully', () => {
    mockTrainedModelsApiService.stopModelAllocation.mockResolvedValueOnce({});

    trainedModelsService.stopModelDeployment('my-model', ['my-deployment'], { force: false });

    expect(mockTrainedModelsApiService.stopModelAllocation).toHaveBeenCalledWith(
      'my-model',
      ['my-deployment'],
      {
        force: false,
      }
    );
  });

  it('handles stopModelDeployment error', async () => {
    mockTrainedModelsApiService.stopModelAllocation.mockRejectedValueOnce(new Error('Stop error'));

    trainedModelsService.stopModelDeployment('bad-model', ['deployment-123']);
    await flushPromises();

    expect(mockDisplayErrorToast).toHaveBeenCalledWith(
      expect.any(Error),
      i18n.translate('xpack.ml.trainedModels.modelsList.stopFailed', {
        defaultMessage: 'Failed to stop "{deploymentIds}"',
        values: { deploymentIds: 'deployment-123' },
      })
    );
  });

  it('deploys a model successfully', async () => {
    mockTrainedModelsApiService.getTrainedModelsList.mockResolvedValueOnce([
      {
        model_id: 'deploy-model',
        state: MODEL_STATE.DOWNLOADED,
        type: ['pytorch'],
      } as unknown as TrainedModelUIItem,
    ]);

    mockTrainedModelsApiService.startModelAllocation.mockResolvedValueOnce({ acknowledge: true });

    trainedModelsService.fetchModels();
    await flushPromises();

    trainedModelsService.startModelDeployment('deploy-model', {
      priority: 'low',
      threads_per_allocation: 1,
      deployment_id: 'my-deployment-id',
    });
    await flushPromises();

    expect(mockTrainedModelsApiService.startModelAllocation).toHaveBeenCalledWith(
      'deploy-model',
      { priority: 'low', threads_per_allocation: 1, deployment_id: 'my-deployment-id' },
      undefined
    );
    expect(mockDisplaySuccessToast).toHaveBeenCalledWith({
      title: i18n.translate('xpack.ml.trainedModels.modelsList.startSuccess', {
        defaultMessage: 'Deployment started',
      }),
      text: i18n.translate('xpack.ml.trainedModels.modelsList.startSuccessText', {
        defaultMessage: '"{deploymentId}" has started successfully.',
        values: { deploymentId: 'my-deployment-id' },
      }),
    });
  });

  it('handles startModelDeployment error', async () => {
    mockTrainedModelsApiService.getTrainedModelsList.mockResolvedValueOnce([
      {
        model_id: 'error-model',
        state: MODEL_STATE.DOWNLOADED,
        type: ['pytorch'],
      } as unknown as TrainedModelUIItem,
    ]);

    const deploymentError = new Error('Deployment error');
    mockTrainedModelsApiService.startModelAllocation.mockRejectedValueOnce(deploymentError);

    trainedModelsService.fetchModels();
    await flushPromises();

    trainedModelsService.startModelDeployment('error-model', {
      priority: 'low',
      threads_per_allocation: 1,
      deployment_id: 'my-deployment-id',
    });
    await flushPromises();

    expect(mockDisplayErrorToast).toHaveBeenCalledWith(
      deploymentError,
      i18n.translate('xpack.ml.trainedModels.modelsList.startFailed', {
        defaultMessage: 'Failed to start "{deploymentId}"',
        values: { deploymentId: 'my-deployment-id' },
      })
    );
  });

  it('updates model deployment successfully', async () => {
    mockTrainedModelsApiService.getTrainedModelsList.mockResolvedValueOnce([
      {
        model_id: 'update-model',
        state: MODEL_STATE.DOWNLOADED,
        type: ['pytorch'],
      } as unknown as TrainedModelUIItem,
    ]);

    mockTrainedModelsApiService.updateModelDeployment.mockResolvedValueOnce({ acknowledge: true });

    trainedModelsService.fetchModels();
    await flushPromises();

    trainedModelsService.updateModelDeployment('update-model', 'my-deployment-id', {
      adaptive_allocations: {
        enabled: true,
        min_number_of_allocations: 1,
        max_number_of_allocations: 2,
      },
    });
    await flushPromises();

    expect(mockTrainedModelsApiService.updateModelDeployment).toHaveBeenCalledWith(
      'update-model',
      'my-deployment-id',
      {
        adaptive_allocations: {
          enabled: true,
          min_number_of_allocations: 1,
          max_number_of_allocations: 2,
        },
      }
    );

    expect(mockDisplaySuccessToast).toHaveBeenCalledWith({
      title: i18n.translate('xpack.ml.trainedModels.modelsList.updateSuccess', {
        defaultMessage: 'Deployment updated',
      }),
      text: i18n.translate('xpack.ml.trainedModels.modelsList.updateSuccessText', {
        defaultMessage: '"{deploymentId}" has been updated successfully.',
        values: { deploymentId: 'my-deployment-id' },
      }),
    });
  });

  it('handles updateModelDeployment error', async () => {
    mockTrainedModelsApiService.getTrainedModelsList.mockResolvedValueOnce([
      {
        model_id: 'update-model',
        state: MODEL_STATE.DOWNLOADED,
        type: ['pytorch'],
      } as unknown as TrainedModelUIItem,
    ]);

    const updateError = new Error('Update error');
    mockTrainedModelsApiService.updateModelDeployment.mockRejectedValueOnce(updateError);

    trainedModelsService.fetchModels();
    await flushPromises();

    trainedModelsService.updateModelDeployment('update-model', 'my-deployment-id', {
      adaptive_allocations: {
        enabled: true,
        min_number_of_allocations: 1,
        max_number_of_allocations: 2,
      },
    });
    await flushPromises();

    expect(mockDisplayErrorToast).toHaveBeenCalledWith(
      updateError,
      i18n.translate('xpack.ml.trainedModels.modelsList.updateFailed', {
        defaultMessage: 'Failed to update "{deploymentId}"',
        values: { deploymentId: 'my-deployment-id' },
      })
    );
  });
});
