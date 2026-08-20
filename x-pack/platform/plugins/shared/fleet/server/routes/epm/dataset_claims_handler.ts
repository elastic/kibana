/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import {
  DATASET_CLAIMS_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import {
  assertNoOverlappingForeignClaims,
  DatasetClaimConflictError,
  withDatasetOwnershipLock,
  type DatasetClaimAttributes,
} from '../../services/epm/packages/dataset_ownership';
import type {
  DatasetClaimDeleteRequestSchema,
  DatasetClaimRequestSchema,
  FleetRequestHandler,
} from '../../types';

export const datasetClaimsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof DatasetClaimRequestSchema.body>
> = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  const { baseName, packageName, packageVersion, installSource, datasetIsPrefix } = request.body;

  // A claim id is a generated Elasticsearch base name such as `logs-payroll.records`, never a bare
  // dataset. Rejecting anything else stops an operator adopting an id no install will ever match.
  if (!baseName.includes('-')) {
    return response.customError({
      statusCode: 400,
      body: {
        message: `"${baseName}" is not a generated dataset name. Expected a value such as "logs-payroll.records".`,
      },
    });
  }

  const indexPatterns = [datasetIsPrefix ? `${baseName}.*-*` : `${baseName}-*`];

  try {
    return await withDatasetOwnershipLock(async () => {
      let existing: DatasetClaimAttributes | undefined;
      try {
        existing = (
          await soClient.get<DatasetClaimAttributes>(DATASET_CLAIMS_SAVED_OBJECT_TYPE, baseName)
        ).attributes;
      } catch (error) {
        if (!SavedObjectsErrorHelpers.isNotFoundError(error)) throw error;
      }

      if (existing && existing.package_name !== packageName) {
        return response.customError({
          statusCode: 409,
          body: {
            message:
              `Dataset "${baseName}" is claimed by package "${existing.package_name}". ` +
              `Uninstall that package before assigning the dataset to "${packageName}".`,
          },
        });
      }

      if (existing) {
        // Same package. Promote to an adoption claim so it authorizes takeover, and make it active so a
        // claim left pending by a failed attempt cannot be used as authorization.
        if (existing.origin !== 'adoption' || existing.status !== 'active') {
          await soClient.update<DatasetClaimAttributes>(
            DATASET_CLAIMS_SAVED_OBJECT_TYPE,
            baseName,
            {
              origin: 'adoption',
              status: 'active',
            }
          );
        }
        return response.ok({ body: { baseName, packageName, created: false } });
      }

      await assertNoOverlappingForeignClaims(soClient, packageName, [{ baseName, indexPatterns }]);

      await soClient.create<DatasetClaimAttributes>(
        DATASET_CLAIMS_SAVED_OBJECT_TYPE,
        {
          package_name: packageName,
          status: 'active',
          origin: 'adoption',
          attempt_id: `adoption-${uuidv4()}`,
          // A placeholder until the package installs: finalizeDatasetClaims refreshes the patterns from
          // the manifest at the end of a successful install.
          index_patterns: indexPatterns,
          package_version: packageVersion,
          install_source: installSource,
        },
        { id: baseName, overwrite: false }
      );

      return response.ok({ body: { baseName, packageName, created: true } });
    });
  } catch (error) {
    if (error instanceof DatasetClaimConflictError) {
      return response.customError({
        statusCode: 409,
        body: { message: error.message },
      });
    }
    throw error;
  }
};

export const datasetClaimsDeleteHandler: FleetRequestHandler<
  TypeOf<typeof DatasetClaimDeleteRequestSchema.params>
> = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  const { baseName } = request.params;

  return withDatasetOwnershipLock(async () => {
    let existing: DatasetClaimAttributes | undefined;
    try {
      existing = (
        await soClient.get<DatasetClaimAttributes>(DATASET_CLAIMS_SAVED_OBJECT_TYPE, baseName)
      ).attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return response.customError({
          statusCode: 404,
          body: { message: `Dataset "${baseName}" is not claimed.` },
        });
      }
      throw error;
    }

    // Live reassignment is not supported: releasing an installed package's claim lets another
    // package adopt the name, after which uninstall of the original package deletes the new
    // owner's templates. DELETE is recovery-only for abandoned pre-install adoption claims.
    if (existing.origin !== 'adoption') {
      return response.customError({
        statusCode: 409,
        body: {
          message:
            `Dataset "${baseName}" is an ${existing.origin} claim and cannot be released this way. ` +
            `Uninstall the package to release it.`,
        },
      });
    }

    try {
      await soClient.get(PACKAGES_SAVED_OBJECT_TYPE, existing.package_name);
      return response.customError({
        statusCode: 409,
        body: {
          message:
            `Dataset "${baseName}" cannot be released while package "${existing.package_name}" is installed. ` +
            `Uninstall the package instead.`,
        },
      });
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) throw error;
    }

    await soClient.delete(DATASET_CLAIMS_SAVED_OBJECT_TYPE, baseName);
    return response.ok({ body: { baseName, deleted: true } });
  });
};
