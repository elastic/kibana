/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization } from '../types';
import {
  anomalyDetectionJobSchema,
  anomalyDetectionUpdateJobSchema,
  deleteForecastSchema,
  jobIdSchema,
  getBucketsSchema,
  getOverallBucketsSchema,
  getCategoriesSchema,
  forecastAnomalyDetector,
  getBucketParamsSchema,
  getModelSnapshotsSchema,
  updateModelSnapshotsSchema,
  updateModelSnapshotBodySchema,
  forceQuerySchema,
  getAnomalyDetectorsResponse,
} from './schemas/anomaly_detectors_schema';
import { getAuthorizationHeader } from '../lib/request_authorization';

/**
 * Routes for the anomaly detectors
 */
export function jobRoutes({ router, routeGuard }: RouteInitialization) {
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetJobs'],
        },
      },
      summary: 'Gets anomaly detectors',
      description: 'Returns the list of anomaly detection jobs.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          response: {
            200: { body: getAnomalyDetectorsResponse, description: 'Anomaly detectors response' },
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
        try {
          const body = await mlClient.getJobs();
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetJobs'],
        },
      },
      summary: 'Gets anomaly detector by ID',
      description: 'Returns the anomaly detection job by ID',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { jobId } = request.params;
          const body = await mlClient.getJobs({ job_id: jobId });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/_stats`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetJobs'],
        },
      },
      summary: 'Gets anomaly detectors stats',
      description: 'Returns the anomaly detection jobs statistics.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
        try {
          const body = await mlClient.getJobStats();
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_stats`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetJobs'],
        },
      },
      summary: 'Gets anomaly detector stats by ID',
      description: 'Returns the anomaly detection job statistics by ID',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { jobId } = request.params;
          const body = await mlClient.getJobStats({ job_id: jobId });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateJob'],
        },
      },
      summary: 'Creates an anomaly detection job',
      description: 'Creates an anomaly detection job.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            body: schema.object(anomalyDetectionJobSchema),
          },
          response: {
            200: {
              body: () => schema.any(),
              description: 'The configuration of the job that has been created.',
            },
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { jobId } = request.params;
          const body = await mlClient.putJob(
            {
              job_id: jobId,
              // @ts-expect-error job type custom_rules is incorrect
              body: request.body,
            },
            getAuthorizationHeader(request)
          );

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_update`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canUpdateJob'],
        },
      },
      summary: 'Updates an anomaly detection job',
      description: 'Updates certain properties of an anomaly detection job.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            body: anomalyDetectionUpdateJobSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { jobId } = request.params;
          const body = await mlClient.updateJob({
            job_id: jobId,
            // @ts-expect-error MlDetector is not compatible
            body: request.body,
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_open`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canOpenJob'],
        },
      },
      summary: 'Opens an anomaly detection job',
      description: 'Opens an anomaly detection job.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { jobId } = request.params;
          const body = await mlClient.openJob({ job_id: jobId });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_close`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCloseJob'],
        },
      },
      summary: 'Closes an anomaly detection job',
      description: 'Closes an anomaly detection job.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            query: forceQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const options: estypes.MlCloseJobRequest = {
            job_id: request.params.jobId,
          };
          const force = request.query.force;
          if (force !== undefined) {
            options.force = force;
          }
          const body = await mlClient.closeJob(options);
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canDeleteJob'],
        },
      },
      summary: 'Deletes an anomaly detection job',
      description: 'Deletes specified anomaly detection job.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            query: forceQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const options: estypes.MlDeleteJobRequest = {
            job_id: request.params.jobId,
            wait_for_completion: false,
          };
          const force = request.query.force;
          if (force !== undefined) {
            options.force = force;
          }
          const body = await mlClient.deleteJob(options);
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_forecast/{forecastId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canDeleteForecast'],
        },
      },
      summary: 'Deletes specified forecast for specified job',
      description: 'Deletes a specified forecast for the specified anomaly detection job.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: deleteForecastSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { jobId, forecastId } = request.params;
          const body = await mlClient.deleteForecast({
            job_id: jobId,
            forecast_id: forecastId,
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/_forecast`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canForecastJob'],
        },
      },
      summary: 'Creates forecast for specified job',
      description:
        'Creates a forecast for the specified anomaly detection job, predicting the future behavior of a time series by using its historical behavior.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            body: forecastAnomalyDetector,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const jobId = request.params.jobId;
          const body = await mlClient.forecast({
            job_id: jobId,
            body: {
              ...request.body,
            },
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/results/buckets/{timestamp?}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetJobs'],
        },
      },
      summary: 'Gets bucket scores',
      description:
        'The get buckets API presents a chronological view of the records, grouped by bucket.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: getBucketParamsSchema,
            body: getBucketsSchema,
          },
          response: {
            200: {
              body: () =>
                schema.object({ count: schema.number(), buckets: schema.arrayOf(schema.any()) }),
            },
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const body = await mlClient.getBuckets({
            job_id: request.params.jobId,
            timestamp: request.params.timestamp,
            body: request.body,
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/results/overall_buckets`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetJobs'],
        },
      },
      summary: 'Get overall buckets',
      description:
        'Retrieves overall bucket results that summarize the bucket results of multiple anomaly detection jobs.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            body: getOverallBucketsSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const body = await mlClient.getOverallBuckets({
            job_id: request.params.jobId,
            top_n: request.body.topN,
            bucket_span: request.body.bucketSpan,
            start: request.body.start !== undefined ? String(request.body.start) : undefined,
            end: request.body.end !== undefined ? String(request.body.end) : undefined,
            overall_score: request.body.overall_score ?? 0,
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/results/categories/{categoryId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetJobs'],
        },
      },
      summary: 'Get categories',
      description: 'Retrieves the categories results for the specified job ID and category ID.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: getCategoriesSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const body = await mlClient.getCategories({
            job_id: request.params.jobId,
            category_id: request.params.categoryId,
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/model_snapshots`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetJobs'],
        },
      },
      summary: 'Get model snapshots by job ID',
      description: 'Returns the model snapshots for the specified job ID',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const body = await mlClient.getModelSnapshots({
            job_id: request.params.jobId,
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/model_snapshots/{snapshotId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetJobs'],
        },
      },
      summary: 'Get model snapshots by id',
      description: 'Returns the model snapshots for the specified job ID and snapshot ID',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: getModelSnapshotsSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const body = await mlClient.getModelSnapshots({
            job_id: request.params.jobId,
            snapshot_id: request.params.snapshotId,
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/model_snapshots/{snapshotId}/_update`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateJob'],
        },
      },
      summary: 'Updates model snapshot by snapshot ID',
      description: 'Updates the model snapshot for the specified snapshot ID',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: updateModelSnapshotsSchema,
            body: updateModelSnapshotBodySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const body = await mlClient.updateModelSnapshot({
            job_id: request.params.jobId,
            snapshot_id: request.params.snapshotId,
            body: request.body,
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/anomaly_detectors/{jobId}/model_snapshots/{snapshotId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateJob'],
        },
      },
      summary: 'Deletes model snapshots by snapshot ID',
      description: 'Deletes the model snapshot for the specified snapshot ID',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: updateModelSnapshotsSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const body = await mlClient.deleteModelSnapshot({
            job_id: request.params.jobId,
            snapshot_id: request.params.snapshotId,
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );
}
