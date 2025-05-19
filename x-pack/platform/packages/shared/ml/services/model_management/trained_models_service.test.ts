/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BehaviorSubject, throwError, of } from 'rxjs';
import type { Observable } from 'rxjs';
import type { TrainedModelsApiService } from '../services/ml_api_service/trained_models';
import type { ScheduledDeployment } from './trained_models_service';
import { TrainedModelsService } from './trained_models_service';
import type {
  StartTrainedModelDeploymentResponse,
  TrainedModelUIItem,
} from '../../../common/types/trained_models';
import { MODEL_STATE } from '@kbn/ml-trained-models-utils';
import { i18n } from '@kbn/i18n';
import type { MlTrainedModelConfig } from '@elastic/elasticsearch/lib/api/types';
import type { ITelemetryClient } from '../services/telemetry/types';
import type { DeploymentParamsUI } from './deployment_setup';
import type { DeploymentParamsMapper } from './deployment_params_mapper';

// Helper that resolves on the next microtask tick
const flushPromises = () =>
  new Promise((resolve) => jest.requireActual('timers').setImmediate(resolve));

describe('TrainedModelsService', () => {
  let mockTrainedModelsApiService: jest.Mocked<TrainedModelsApiService>;
  let trainedModelsService: TrainedModelsService;
  let scheduledDeploymentsSubject: BehaviorSubject<ScheduledDeployment[]>;
  let mockSetScheduledDeployments: jest.Mock<any, any>;
  let mockTelemetryService: jest.Mocked<ITelemetryClient>;
  let mockDeploymentParamsMapper: jest.Mocked<DeploymentParamsMapper>;

  const startModelAllocationResponseMock = {
    assignment: {
      task_parameters: {
        model_id: 'deploy-model',
        model_bytes: 1000,
        allocation_id: 'test-allocation',
        priority: 'normal',
        number_of_allocations: 1,
        threads_per_allocation: 1,
        queue_capacity: 1024,
        deployment_id: 'my-deployment-id',
        cache_size: '1mb',
        per_deployment_memory_bytes: '1mb',
        per_allocation_memory_bytes: '1mb',
      },
      node_count: 1,
      routing_table: {
        'node-1': {
          routing_state: 'started',
          reason: '',
          current_allocations: 1,
          target_allocations: 1,
        },
      },
      assignment_state: 'started',
      start_time: 1234567890,
      adaptive_allocations: {
        enabled: true,
        min_number_of_allocations: 1,
        max_number_of_allocations: 4,
      },
    } as const,
  };

  const deploymentParamsUiMock: DeploymentParamsUI = {
    deploymentId: 'my-deployment-id',
    optimized: 'optimizedForIngest',
    adaptiveResources: false,
    vCPUUsage: 'low',
  };

  const mockDisplayErrorToast = jest.fn();
  const mockDisplaySuccessToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    scheduledDeploymentsSubject = new BehaviorSubject<ScheduledDeployment[]>([]);
    mockSetScheduledDeployments = jest.fn((deployments: ScheduledDeployment[]) => {
      scheduledDeploymentsSubject.next(deployments);
    });

    mockTelemetryService = {
      trackTrainedModelsDeploymentCreated: jest.fn(),
    } as unknown as jest.Mocked<ITelemetryClient>;

    mockTrainedModelsApiService = {
      getTrainedModelsList: jest.fn(),
      installElasticTrainedModelConfig: jest.fn(),
      stopModelAllocation: jest.fn(),
      startModelAllocation: jest.fn(),
      updateModelDeployment: jest.fn(),
      getModelsDownloadStatus: jest.fn(),
      deleteTrainedModel: jest.fn(),
    } as unknown as jest.Mocked<TrainedModelsApiService>;

    mockDeploymentParamsMapper = {
      mapUiToApiDeploymentParams: jest.fn().mockReturnValue({
        modelId: 'test-model',
        deploymentParams: {
          deployment_id: 'my-deployment-id',
          priority: 'normal',
          threads_per_allocation: 1,
          number_of_allocations: 1,
        },
      }),
      mapApiToUiDeploymentParams: jest.fn().mockReturnValue({
        deploymentId: 'my-deployment-id',
        optimized: 'optimizedForIngest',
        adaptiveResources: false,
        vCPUUsage: 'low',
      }),
    } as unknown as jest.Mocked<DeploymentParamsMapper>;

    trainedModelsService = new TrainedModelsService(mockTrainedModelsApiService);
    trainedModelsService.init({
      scheduledDeployments$: scheduledDeploymentsSubject,
      setScheduledDeployments: mockSetScheduledDeployments,
      displayErrorToast: mockDisplayErrorToast,
      displaySuccessToast: mockDisplaySuccessToast,
      telemetryService: mockTelemetryService,
      deploymentParamsMapper: mockDeploymentParamsMapper,
    });

    mockTrainedModelsApiService.getTrainedModelsList.mockResolvedValue([]);
  });

  afterEach(() => {
    trainedModelsService.destroy();
    jest.useRealTimers();
  });

  it('initializes and fetches models successfully', () => {
    const mockModels: TrainedModelUIItem[] = [
      {
        model_id: 'test-model-1',
        state: MODEL_STATE.DOWNLOADED,
      } as unknown as TrainedModelUIItem,
    ];

    mockTrainedModelsApiService.getTrainedModelsList.mockResolvedValue(mockModels);

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

    // Advance timers enough to pass the debounceTime(100)
    jest.advanceTimersByTime(100);
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
    expect(mockTrainedModelsApiService.installElasticTrainedModelConfig).toHaveBeenCalledTimes(1);
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
    const mockModel = {
      model_id: 'test-model',
      state: MODEL_STATE.DOWNLOADED,
      type: ['pytorch'],
    } as unknown as TrainedModelUIItem;

    mockTrainedModelsApiService.getTrainedModelsList.mockResolvedValueOnce([mockModel]);

    mockTrainedModelsApiService.startModelAllocation.mockReturnValueOnce(
      of(startModelAllocationResponseMock)
    );

    // Start deployment
    trainedModelsService.startModelDeployment('test-model', deploymentParamsUiMock);

    // Advance timers enough to pass the debounceTime(100)
    jest.advanceTimersByTime(100);
    await flushPromises();

    expect(mockTrainedModelsApiService.startModelAllocation).toHaveBeenCalledWith({
      modelId: 'test-model',
      deploymentParams: expect.objectContaining({
        deployment_id: 'my-deployment-id',
        priority: expect.any(String),
        number_of_allocations: expect.any(Number),
        threads_per_allocation: expect.any(Number),
      }),
      adaptiveAllocationsParams: undefined,
    });
    expect(mockDisplaySuccessToast).toHaveBeenCalledWith({
      title: i18n.translate('xpack.ml.trainedModels.modelsList.startSuccess', {
        defaultMessage: 'Deployment started',
      }),
      text: i18n.translate('xpack.ml.trainedModels.modelsList.startSuccessText', {
        defaultMessage: '"{deploymentId}" has started successfully.',
        values: { deploymentId: 'my-deployment-id' },
      }),
    });
    expect(mockTelemetryService.trackTrainedModelsDeploymentCreated).toHaveBeenCalled();
  });

  it('handles startModelDeployment error', async () => {
    const mockModel = {
      model_id: 'error-model',
      state: MODEL_STATE.DOWNLOADED,
      type: ['pytorch'],
    } as unknown as TrainedModelUIItem;

    mockTrainedModelsApiService.getTrainedModelsList.mockResolvedValueOnce([mockModel]);

    const deploymentError = new Error('Deployment error');

    mockTrainedModelsApiService.startModelAllocation.mockReturnValueOnce(
      throwError(
        () => deploymentError
      ) as unknown as Observable<StartTrainedModelDeploymentResponse>
    );

    trainedModelsService.startModelDeployment('error-model', deploymentParamsUiMock);

    // Advance timers enough to pass the debounceTime(100)
    jest.advanceTimersByTime(100);
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
    mockTrainedModelsApiService.updateModelDeployment.mockResolvedValueOnce({
      assignment: {
        assignment_state: 'started',
        routing_table: {
          'node-1': {
            routing_state: 'started',
            reason: '',
            current_allocations: 1,
            target_allocations: 1,
          },
        },
        start_time: 1234567890,
        task_parameters: {
          model_id: 'test-model',
          model_bytes: 1000,
          priority: 'normal',
          number_of_allocations: 1,
          threads_per_allocation: 1,
          queue_capacity: 1024,
          deployment_id: 'my-deployment-id',
          per_deployment_memory_bytes: '1mb',
          per_allocation_memory_bytes: '1mb',
        },
      },
    });

    trainedModelsService.updateModelDeployment('test-model', deploymentParamsUiMock);
    await flushPromises();

    expect(mockTrainedModelsApiService.updateModelDeployment).toHaveBeenCalledWith(
      'test-model',
      'my-deployment-id',
      expect.objectContaining({
        number_of_allocations: expect.any(Number),
      })
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
    const updateError = new Error('Update error');
    mockTrainedModelsApiService.updateModelDeployment.mockRejectedValueOnce(updateError);

    trainedModelsService.updateModelDeployment('update-model', deploymentParamsUiMock);
    await flushPromises();

    expect(mockDisplayErrorToast).toHaveBeenCalledWith(
      updateError,
      i18n.translate('xpack.ml.trainedModels.modelsList.updateFailed', {
        defaultMessage: 'Failed to update "{deploymentId}"',
        values: { deploymentId: 'my-deployment-id' },
      })
    );
  });

  it('allows new deployments after a failed deployment', async () => {
    const mockModel = {
      model_id: 'test-model',
      state: MODEL_STATE.DOWNLOADED,
      type: ['pytorch'],
    } as unknown as TrainedModelUIItem;

    mockTrainedModelsApiService.getTrainedModelsList.mockResolvedValue([mockModel]);

    mockTrainedModelsApiService.startModelAllocation
      .mockReturnValueOnce(throwError(() => new Error('First deployment failed')))
      .mockReturnValueOnce(of(startModelAllocationResponseMock));

    // First deployment
    trainedModelsService.startModelDeployment('test-model', deploymentParamsUiMock);

    jest.advanceTimersByTime(100);
    await flushPromises();

    expect(mockDisplayErrorToast).toHaveBeenCalledWith(
      expect.any(Error),
      expect.stringContaining('my-deployment-id')
    );

    jest.advanceTimersByTime(100);
    await flushPromises();

    // Second deployment
    trainedModelsService.startModelDeployment('test-model', deploymentParamsUiMock);

    jest.advanceTimersByTime(100);
    await flushPromises();

    expect(mockTrainedModelsApiService.startModelAllocation).toHaveBeenCalledTimes(2);
    expect(mockDisplaySuccessToast).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('my-deployment-id'),
      })
    );
  });

  it('deletes multiple models successfully', async () => {
    const modelIds = ['model-1', 'model-2'];

    mockTrainedModelsApiService.deleteTrainedModel.mockResolvedValue({ acknowledge: true });

    await trainedModelsService.deleteModels(modelIds, {
      with_pipelines: false,
      force: false,
    });

    expect(mockTrainedModelsApiService.deleteTrainedModel).toHaveBeenCalledTimes(2);
    expect(mockTrainedModelsApiService.deleteTrainedModel).toHaveBeenCalledWith({
      modelId: 'model-1',
      options: {
        with_pipelines: false,
        force: false,
      },
    });
    expect(mockTrainedModelsApiService.deleteTrainedModel).toHaveBeenCalledWith({
      modelId: 'model-2',
      options: {
        with_pipelines: false,
        force: false,
      },
    });
  });

  it('handles deleteModels error', async () => {
    const modelIds = ['model-1', 'model-2'];
    const error = new Error('Deletion failed');

    mockTrainedModelsApiService.deleteTrainedModel.mockRejectedValue(error);

    await trainedModelsService.deleteModels(modelIds, {
      with_pipelines: false,
      force: false,
    });

    expect(mockDisplayErrorToast).toHaveBeenCalledWith(
      error,
      i18n.translate('xpack.ml.trainedModels.modelsList.fetchDeletionErrorTitle', {
        defaultMessage: '{modelsCount, plural, one {Model} other {Models}} deletion failed',
        values: {
          modelsCount: modelIds.length,
        },
      }),
      undefined,
      modelIds.join(', ')
    );
  });
});
