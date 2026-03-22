/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { COMPLIANCE_API_BASE } from '../../../common/compliance';
import { ComplianceTransformCleanupService } from '../services/transform_cleanup_service';

/**
 * Registers cleanup routes for compliance transform infrastructure.
 * These routes are for administrative use when the feature needs to be disabled
 * or when there are infrastructure issues that require cleanup.
 */
export function complianceCleanupRoutes(router: IRouter) {
  // Manual cleanup route for administrators
  router.post(
    {
      path: `${COMPLIANCE_API_BASE}/_cleanup`,
      validate: {
        body: schema.object({
          cleanup_type: schema.oneOf([
            schema.literal('graceful'),
            schema.literal('full'), 
            schema.literal('emergency')
          ], {
            defaultValue: 'graceful'
          }),
          validate_cleanup: schema.boolean({ defaultValue: true })
        })
      },
      access: 'internal',
    },
    async (context, request, response) => {
      try {
        const { cleanup_type: cleanupType, validate_cleanup: validateCleanup } = request.body;
        const esClient = (await context.core).elasticsearch.client.asInternalUser;

        const cleanupService = new ComplianceTransformCleanupService(
          esClient,
          context.logger
        );

        // Perform the requested cleanup
        let cleanupResult;
        switch (cleanupType) {
          case 'full':
            cleanupResult = await cleanupService.performFullCleanup();
            break;
          case 'emergency':
            cleanupResult = await cleanupService.performEmergencyCleanup();
            break;
          case 'graceful':
          default:
            cleanupResult = await cleanupService.performGracefulCleanup();
            break;
        }

        // Optionally validate cleanup results
        let validationResult = null;
        if (validateCleanup) {
          validationResult = await cleanupService.validateCleanup();
        }

        return response.ok({
          body: {
            success: cleanupResult.success,
            cleanup_type: cleanupType,
            cleanup_steps: cleanupResult.cleanupSteps,
            validation: validationResult,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        context.logger.error('Compliance cleanup API error:', error);
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to perform compliance cleanup',
            error: error.message,
          },
        });
      }
    }
  );

  // Status route to check what needs cleanup
  router.get(
    {
      path: `${COMPLIANCE_API_BASE}/_cleanup/status`,
      validate: {},
      access: 'internal',
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asInternalUser;

        const cleanupService = new ComplianceTransformCleanupService(
          esClient,
          context.logger
        );

        const validationResult = await cleanupService.validateCleanup();

        return response.ok({
          body: {
            is_clean: validationResult.isClean,
            remaining_resources: validationResult.remainingResources,
            needs_cleanup: !validationResult.isClean,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        context.logger.error('Compliance cleanup status API error:', error);
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to check cleanup status',
            error: error.message,
          },
        });
      }
    }
  );
}