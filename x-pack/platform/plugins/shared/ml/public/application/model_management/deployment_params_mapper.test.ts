/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlTrainedModelAssignmentTaskParametersAdaptive } from './deployment_params_mapper';
import { DeploymentParamsMapper } from './deployment_params_mapper';
import type { CloudInfo } from '../services/ml_server_info';
import type { MlServerLimits } from '../../../common/types/ml_server_info';

describe('DeploymentParamsMapper', () => {
  const modelId = 'test-model';

  const mlServerLimits: MlServerLimits = {
    max_single_ml_node_processors: 10,
    total_ml_processors: 10,
  };

  const cloudInfo = {
    isMlAutoscalingEnabled: false,
  } as CloudInfo;

  let mapper: DeploymentParamsMapper;

  describe('DeploymentParamsMapper', () => {
    describe('running in serverless', () => {
      beforeEach(() => {
        mapper = new DeploymentParamsMapper(
          {
            max_single_ml_node_processors: 16,
            total_ml_processors: 32,
          },
          {
            isMlAutoscalingEnabled: false,
          } as CloudInfo,
          {
            modelDeployment: {
              allowStaticAllocations: false,
              vCPURange: {
                low: { min: 0, max: 2, static: 2, maxThreads: 2 },
                medium: { min: 0, max: 32, static: 32, maxThreads: 4 },
                high: { min: 0, max: 512, static: 512, maxThreads: 8 },
              },
            },
          }
        );
      });

      it('should get correct VCU levels', () => {
        expect(mapper.getVCURange('low')).toEqual({
          min: 0,
          max: 16,
          static: 16,
        });
        expect(mapper.getVCURange('medium')).toEqual({
          min: 0,
          max: 256,
          static: 256,
        });
        expect(mapper.getVCURange('high')).toEqual({
          min: 0,
          max: 4096,
          static: 4096,
        });
      });

      it('maps UI params to API correctly', () => {
        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          adaptiveAllocationsParams: {
            enabled: true,
            max_number_of_allocations: 1,
            min_number_of_allocations: 0,
          },
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 2,
          },
          modelId: 'test-model',
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          adaptiveAllocationsParams: {
            enabled: true,
            max_number_of_allocations: 2,
            min_number_of_allocations: 0,
          },
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 1,
          },
          modelId: 'test-model',
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          modelId: 'test-model',
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 4,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            max_number_of_allocations: 8,
            min_number_of_allocations: 0,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'high',
          })
        ).toEqual({
          modelId: 'test-model',
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 8,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            max_number_of_allocations: 64,
            min_number_of_allocations: 0,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: true,
            vCPUUsage: 'high',
          })
        ).toEqual({
          modelId: 'test-model',
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 1,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            max_number_of_allocations: 512,
            min_number_of_allocations: 0,
          },
        });
      });

      it('maps API params to UI correctly', () => {
        expect(
          mapper.mapApiToUiDeploymentParams({
            model_id: modelId,
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 8,
            adaptive_allocations: {
              enabled: true,
              min_number_of_allocations: 0,
              max_number_of_allocations: 8,
            },
          } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
        ).toEqual({
          deploymentId: 'test-deployment',
          optimized: 'optimizedForSearch',
          adaptiveResources: true,
          vCPUUsage: 'high',
        });

        expect(
          mapper.mapApiToUiDeploymentParams({
            model_id: modelId,
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 4,
            adaptive_allocations: {
              enabled: true,
              min_number_of_allocations: 1,
              max_number_of_allocations: 2,
            },
          } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
        ).toEqual({
          deploymentId: 'test-deployment',
          optimized: 'optimizedForSearch',
          adaptiveResources: true,
          vCPUUsage: 'medium',
        });

        expect(
          mapper.mapApiToUiDeploymentParams({
            model_id: modelId,
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 2,
            adaptive_allocations: {
              enabled: true,
              min_number_of_allocations: 0,
              max_number_of_allocations: 1,
            },
          } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
        ).toEqual({
          deploymentId: 'test-deployment',
          optimized: 'optimizedForSearch',
          adaptiveResources: true,
          vCPUUsage: 'low',
        });
      });

      it('overrides vCPUs levels and enforces adaptive allocations if static support is not configured', () => {
        mapper = new DeploymentParamsMapper(mlServerLimits, cloudInfo, {
          modelDeployment: {
            allowStaticAllocations: false,
            vCPURange: {
              low: { min: 0, max: 2, static: 2, maxThreads: 2 },
              medium: { min: 0, max: 32, static: 32, maxThreads: 4 },
              high: { min: 0, max: 128, static: 128, maxThreads: 8 },
            },
          },
        });

        expect(mapper.getVCURange('low')).toEqual({
          min: 0,
          max: 16,
          static: 16,
        });
        expect(mapper.getVCURange('medium')).toEqual({
          min: 0,
          max: 256,
          static: 256,
        });
        expect(mapper.getVCURange('high')).toEqual({
          min: 0,
          max: 1024,
          static: 1024,
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          modelId: 'test-model',
          adaptiveAllocationsParams: {
            enabled: true,
            max_number_of_allocations: 1,
            min_number_of_allocations: 0,
          },
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 2,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          modelId: 'test-model',
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 1,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            max_number_of_allocations: 2,
            min_number_of_allocations: 0,
          },
        });
      });
    });

    describe('32 cores, 16 single', () => {
      beforeEach(() => {
        mapper = new DeploymentParamsMapper(
          {
            max_single_ml_node_processors: 16,
            total_ml_processors: 32,
          },
          {
            isMlAutoscalingEnabled: false,
          } as CloudInfo
        );
      });

      it('should provide vCPU level', () => {
        expect(mapper.getVCPURange('low')).toEqual({ min: 1, max: 2, static: 2 });
        expect(mapper.getVCPURange('medium')).toEqual({ min: 3, max: 16, static: 16 });
        expect(mapper.getVCPURange('high')).toEqual({ min: 17, max: 32, static: 32 });
      });
    });

    describe('when autoscaling is disabled', () => {
      beforeEach(() => {
        mapper = new DeploymentParamsMapper(mlServerLimits, {
          isMlAutoscalingEnabled: false,
        } as CloudInfo);
      });

      it('should map UI params to API request correctly', () => {
        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 2,
            number_of_allocations: 1,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 8,
            number_of_allocations: 1,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'high',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 8,
            number_of_allocations: 1,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 1,
            number_of_allocations: 2,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 1,
            number_of_allocations: 5,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'high',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 1,
            number_of_allocations: 10,
          },
        });
      });

      it('should map UI params to API request correctly with adaptive resources', () => {
        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'low',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 2,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 1,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 8,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 1,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'high',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 8,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 1,
          },
        });
      });

      describe('mapApiToUiDeploymentParams', () => {
        it('should map API params to UI correctly', () => {
          const input = {
            model_id: modelId,
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 8,
            number_of_allocations: 2,
          } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive;
          expect(mapper.mapApiToUiDeploymentParams(input)).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'high',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 1,
              number_of_allocations: 1,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'low',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 2,
              number_of_allocations: 2,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          });
        });

        it('should map API params to UI correctly with adaptive resources', () => {
          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 8,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 2,
                max_number_of_allocations: 2,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'high',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 2,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 2,
                max_number_of_allocations: 2,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'medium',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 1,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 1,
                max_number_of_allocations: 1,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: true,
            vCPUUsage: 'low',
          });
        });
      });
    });

    describe('when autoscaling is enabled', () => {
      beforeEach(() => {
        mapper = new DeploymentParamsMapper(
          {
            max_single_ml_node_processors: 16,
            total_ml_processors: 32,
          } as MlServerLimits,
          {
            isMlAutoscalingEnabled: true,
          } as CloudInfo
        );
      });

      it('should map UI params to API request correctly', () => {
        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 2,
            number_of_allocations: 1,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 16,
            number_of_allocations: 2,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'high',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 16,
            number_of_allocations: 6249,
          },
        });
      });

      it('should map UI params to API request correctly with adaptive resources', () => {
        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'low',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 2,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            min_number_of_allocations: 0,
            max_number_of_allocations: 1,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 16,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 2,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'high',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 16,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            max_number_of_allocations: 6249,
            min_number_of_allocations: 1,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: true,
            vCPUUsage: 'low',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 1,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            min_number_of_allocations: 0,
            max_number_of_allocations: 2,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: true,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 1,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 32,
          },
        });

        expect(
          mapper.mapUiToApiDeploymentParams(modelId, {
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: true,
            vCPUUsage: 'high',
          })
        ).toEqual({
          modelId,
          deploymentParams: {
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 1,
          },
          adaptiveAllocationsParams: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 99999,
          },
        });
      });

      describe('mapApiToUiDeploymentParams', () => {
        it('should map API params to UI correctly', () => {
          // Optimized for search
          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 16,
              number_of_allocations: 2,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          });

          // Lower value
          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 4,
              number_of_allocations: 1,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 8,
              number_of_allocations: 2,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 2,
              number_of_allocations: 1,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'low',
          });

          // Exact match
          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 16,
              number_of_allocations: 8,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'high',
          });

          // Higher value
          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 16,
              number_of_allocations: 12,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'high',
          });

          // Lower value
          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 16,
              number_of_allocations: 5,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'high',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 16,
              number_of_allocations: 6,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'high',
          });

          // Optimized for ingest
          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 1,
              number_of_allocations: 1,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'low',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 1,
              number_of_allocations: 2,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'low',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 1,
              number_of_allocations: 6,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          });
        });

        it('should map API params to UI correctly with adaptive resources', () => {
          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 8,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 2,
                max_number_of_allocations: 2,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'medium',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 2,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 2,
                max_number_of_allocations: 2,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'medium',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 1,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 1,
                max_number_of_allocations: 1,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: true,
            vCPUUsage: 'low',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 2,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 0,
                max_number_of_allocations: 1,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'low',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 1,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 0,
                max_number_of_allocations: 64,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: true,
            vCPUUsage: 'high',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 16,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 0,
                max_number_of_allocations: 12,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'high',
          });
        });
      });
    });
  });
});
