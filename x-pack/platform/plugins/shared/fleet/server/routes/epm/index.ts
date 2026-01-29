/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core-http-server';

import {
  BulkRollbackAvailableCheckResponseSchema,
  RollbackAvailableCheckResponseSchema,
} from '../../../common/types/rest_spec/epm';

import { parseExperimentalConfigValue } from '../../../common/experimental_features';
import { API_VERSIONS } from '../../../common/constants';
import type { FleetAuthz } from '../../../common';

import {
  calculateRouteAuthz,
  type FleetAuthzRouter,
  getRouteRequiredAuthz,
} from '../../services/security';
import type { FleetAuthzRouteConfig } from '../../services/security/types';

import { EPM_API_ROUTES } from '../../constants';
import {
  GetCategoriesRequestSchema,
  GetPackagesRequestSchema,
  GetInstalledPackagesRequestSchema,
  GetFileRequestSchema,
  GetInfoRequestSchema,
  GetBulkAssetsRequestSchema,
  InstallPackageFromRegistryRequestSchema,
  InstallPackageByUploadRequestSchema,
  DeletePackageRequestSchema,
  BulkInstallPackagesFromRegistryRequestSchema,
  GetStatsRequestSchema,
  UpdatePackageRequestSchema,
  ReauthorizeTransformRequestSchema,
  GetDataStreamsRequestSchema,
  CreateCustomIntegrationRequestSchema,
  GetInputsRequestSchema,
  InstallKibanaAssetsRequestSchema,
  DeleteKibanaAssetsRequestSchema,
  GetCategoriesResponseSchema,
  GetPackagesResponseSchema,
  GetInstalledPackagesResponseSchema,
  GetLimitedPackagesResponseSchema,
  GetStatsResponseSchema,
  GetInputsResponseSchema,
  GetFileResponseSchema,
  GetInfoResponseSchema,
  UpdatePackageResponseSchema,
  InstallPackageResponseSchema,
  InstallKibanaAssetsResponseSchema,
  BulkInstallPackagesFromRegistryResponseSchema,
  DeletePackageResponseSchema,
  GetVerificationKeyIdResponseSchema,
  GetDataStreamsResponseSchema,
  GetBulkAssetsResponseSchema,
  ReauthorizeTransformResponseSchema,
  BulkUpgradePackagesRequestSchema,
  BulkUpgradePackagesResponseSchema,
  GetOneBulkOperationPackagesRequestSchema,
  GetOneBulkOperationPackagesResponseSchema,
  BulkUninstallPackagesRequestSchema,
  CustomIntegrationRequestSchema,
  DeletePackageDatastreamAssetsRequestSchema,
  DeletePackageDatastreamAssetsResponseSchema,
  RollbackPackageRequestSchema,
  RollbackPackageResponseSchema,
  GetKnowledgeBaseRequestSchema,
  GetKnowledgeBaseResponseSchema,
  BulkRollbackPackagesRequestSchema,
  BulkRollbackPackagesResponseSchema,
  InstallRuleAssetsRequestSchema,
} from '../../types';
import type { FleetConfigType } from '../../config';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { genericErrorResponse } from '../schema/errors';

import {
  getCategoriesHandler,
  getListHandler,
  getInstalledListHandler,
  getLimitedListHandler,
  getInfoHandler,
  getBulkAssetsHandler,
  installPackageFromRegistryHandler,
  installPackageByUploadHandler,
  deletePackageHandler,
  bulkInstallPackagesFromRegistryHandler,
  getStatsHandler,
  updatePackageHandler,
  getVerificationKeyIdHandler,
  reauthorizeTransformsHandler,
  getDataStreamsHandler,
  createCustomIntegrationHandler,
  getInputsHandler,
  updateCustomIntegrationHandler,
  getKnowledgeBaseHandler,
  rollbackPackageHandler,
  rollbackAvailableCheckHandler,
  bulkRollbackAvailableCheckHandler,
} from './handlers';
import { getFileHandler } from './file_handler';
import {
  deletePackageKibanaAssetsHandler,
  installPackageKibanaAssetsHandler,
  installRuleAssetsHandler,
} from './install_assets_handler';
import {
  postBulkUpgradePackagesHandler,
  postBulkUninstallPackagesHandler,
  getOneBulkOperationPackagesHandler,
  postBulkRollbackPackagesHandler,
} from './bulk_handler';
import { deletePackageDatastreamAssetsHandler } from './package_datastream_assets_handler';

const MAX_FILE_SIZE_BYTES = 104857600; // 100MB

export const INSTALL_PACKAGES_AUTHZ: FleetAuthzRouteConfig['fleetAuthz'] = {
  integrations: { installPackages: true },
};

export const INSTALL_PACKAGES_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [
      FLEET_API_PRIVILEGES.INTEGRATIONS.ALL,
      FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL,
    ],
  },
};

export const READ_PACKAGE_INFO_AUTHZ: FleetAuthzRouteConfig['fleetAuthz'] = {
  integrations: { readPackageInfo: true },
};

export const READ_PACKAGE_INFO_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [
      {
        anyRequired: [
          FLEET_API_PRIVILEGES.INTEGRATIONS.READ,
          FLEET_API_PRIVILEGES.SETUP,
          FLEET_API_PRIVILEGES.FLEET.ALL,
        ],
      },
    ],
  },
};

export const registerRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  const experimentalFeatures = parseExperimentalConfigValue(
    config.enableExperimental || [],
    config.experimentalFeatures || {}
  );

  router.versioned
    .get({
      path: EPM_API_ROUTES.CATEGORIES_PATTERN,
      security: READ_PACKAGE_INFO_SECURITY,
      summary: `Get package categories`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetCategoriesRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetCategoriesResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getCategoriesHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.LIST_PATTERN,
      security: READ_PACKAGE_INFO_SECURITY,
      summary: `Get packages`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetPackagesRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetPackagesResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getListHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.INSTALLED_LIST_PATTERN,
      security: READ_PACKAGE_INFO_SECURITY,
      summary: `Get installed packages`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetInstalledPackagesRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetInstalledPackagesResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getInstalledListHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.LIMITED_LIST_PATTERN,
      security: READ_PACKAGE_INFO_SECURITY,
      summary: `Get a limited package list`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetLimitedPackagesResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getLimitedListHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.STATS_PATTERN,
      security: READ_PACKAGE_INFO_SECURITY,
      summary: `Get package stats`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetStatsRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetStatsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getStatsHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.INPUTS_PATTERN,
      security: READ_PACKAGE_INFO_SECURITY,
      summary: `Get an inputs template`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetInputsRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetInputsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getInputsHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.FILEPATH_PATTERN,
      security: READ_PACKAGE_INFO_SECURITY,
      summary: `Get a package file`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetFileRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetFileResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getFileHandler
    );

  router.versioned
    // @ts-ignore TODO move to kibana authz https://github.com/elastic/kibana/issues/203170
    .get({
      path: EPM_API_ROUTES.INFO_PATTERN,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(fleetAuthz, getRouteRequiredAuthz('get', EPM_API_ROUTES.INFO_PATTERN))
          .granted,
      summary: `Get a package`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetInfoRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetInfoResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getInfoHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.KNOWLEDGE_BASE_PATTERN,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(
          fleetAuthz,
          getRouteRequiredAuthz('get', EPM_API_ROUTES.KNOWLEDGE_BASE_PATTERN)
        ).granted,
      security: {
        authz: {
          enabled: false,
          reason:
            'This route uses Fleet authorization via fleetAuthz instead of standard Kibana authorization',
        },
      },
      summary: `Get all knowledge base content for a package`,
      options: {
        tags: ['internal', 'oas-tag:Elastic Package Manager (EPM)'],
      },
      access: 'internal',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: GetKnowledgeBaseRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetKnowledgeBaseResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getKnowledgeBaseHandler
    );

  router.versioned
    .put({
      path: EPM_API_ROUTES.INFO_PATTERN,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Update package settings`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: UpdatePackageRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => UpdatePackageResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      updatePackageHandler
    );

  router.versioned
    .post({
      path: EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Install a package from the registry`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: InstallPackageFromRegistryRequestSchema,
          response: {
            200: {
              body: () => InstallPackageResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      installPackageFromRegistryHandler
    );

  router.versioned
    .post({
      path: EPM_API_ROUTES.INSTALL_RULE_ASSETS_PATTERN,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Install Kibana alert rule for a package`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: InstallRuleAssetsRequestSchema,
          response: {
            200: {
              body: () => InstallKibanaAssetsResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      installRuleAssetsHandler
    );
  router.versioned
    .post({
      path: EPM_API_ROUTES.INSTALL_KIBANA_ASSETS_PATTERN,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Install Kibana assets for a package`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: InstallKibanaAssetsRequestSchema,
          response: {
            200: {
              body: () => InstallKibanaAssetsResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      installPackageKibanaAssetsHandler
    );

  router.versioned
    .delete({
      path: EPM_API_ROUTES.DELETE_KIBANA_ASSETS_PATTERN,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Delete Kibana assets for a package`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteKibanaAssetsRequestSchema,
          response: {
            200: {
              body: () => InstallKibanaAssetsResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      deletePackageKibanaAssetsHandler
    );

  router.versioned
    .post({
      path: EPM_API_ROUTES.BULK_UPGRADE_PATTERN,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Bulk upgrade packages`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: BulkUpgradePackagesRequestSchema,
          response: {
            200: {
              body: () => BulkUpgradePackagesResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      postBulkUpgradePackagesHandler
    );

  router.versioned
    .post({
      path: EPM_API_ROUTES.BULK_UNINSTALL_PATTERN,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Bulk uninstall packages`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: BulkUninstallPackagesRequestSchema,
          response: {
            200: {
              body: () => BulkUpgradePackagesResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      postBulkUninstallPackagesHandler
    );

  if (experimentalFeatures.enablePackageRollback) {
    router.versioned
      .post({
        path: EPM_API_ROUTES.BULK_ROLLBACK_PATTERN,
        security: INSTALL_PACKAGES_SECURITY,
        summary: `Bulk rollback packages`,
        options: {
          tags: ['oas-tag:Elastic Package Manager (EPM)'],
        },
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          options: {
            oasOperationObject: () => ({
              requestBody: {
                content: {
                  'application/json': {
                    examples: {
                      bulkRollbackRequest: {
                        value: {
                          packages: [{ name: 'system' }],
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  content: {
                    'application/json': {
                      examples: {
                        successResponse: {
                          value: {
                            taskId: 'taskId',
                          },
                        },
                      },
                    },
                  },
                },
                400: {
                  content: {
                    'application/json': {
                      examples: {
                        badRequestResponse: {
                          value: {
                            message: 'Bad Request',
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
          validate: {
            request: BulkRollbackPackagesRequestSchema,
            response: {
              200: {
                body: () => BulkRollbackPackagesResponseSchema,
                description: 'OK: A successful request.',
              },
              400: {
                body: genericErrorResponse,
                description: 'A bad request.',
              },
            },
          },
        },
        postBulkRollbackPackagesHandler
      );

    router.versioned
      .get({
        path: EPM_API_ROUTES.BULK_ROLLBACK_INFO_PATTERN,
        security: INSTALL_PACKAGES_SECURITY,
        summary: `Get Bulk rollback packages details`,
        options: {
          tags: ['oas-tag:Elastic Package Manager (EPM)'],
        },
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          options: {
            oasOperationObject: () => ({
              responses: {
                200: {
                  content: {
                    'application/json': {
                      examples: {
                        successResponse: {
                          value: {
                            status: 'success',
                          },
                        },
                      },
                    },
                  },
                },
                400: {
                  content: {
                    'application/json': {
                      examples: {
                        badRequestResponse: {
                          value: {
                            message: 'Bad Request',
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
          validate: {
            request: GetOneBulkOperationPackagesRequestSchema,
            response: {
              200: {
                body: () => GetOneBulkOperationPackagesResponseSchema,
                description: 'OK: A successful request.',
              },
              400: {
                body: genericErrorResponse,
                description: 'A bad request.',
              },
            },
          },
        },
        getOneBulkOperationPackagesHandler
      );
  }

  router.versioned
    .get({
      path: EPM_API_ROUTES.BULK_UNINSTALL_INFO_PATTERN,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Get Bulk uninstall packages details`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOneBulkOperationPackagesRequestSchema,
          response: {
            200: {
              body: () => GetOneBulkOperationPackagesResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      getOneBulkOperationPackagesHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.BULK_UPGRADE_INFO_PATTERN,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Get Bulk upgrade packages details`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOneBulkOperationPackagesRequestSchema,
          response: {
            200: {
              body: () => GetOneBulkOperationPackagesResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      getOneBulkOperationPackagesHandler
    );

  router.versioned
    .post({
      path: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Bulk install packages`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: BulkInstallPackagesFromRegistryRequestSchema,
          response: {
            200: {
              body: () => BulkInstallPackagesFromRegistryResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      bulkInstallPackagesFromRegistryHandler
    );

  // Only allow upload for superuser
  router.versioned
    .post({
      path: EPM_API_ROUTES.INSTALL_BY_UPLOAD_PATTERN,
      options: {
        body: {
          accepts: ['application/gzip', 'application/zip'],
          parse: false,
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
        tags: [`oas-tag:Elastic Package Manager (EPM)`],
      },
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Install a package by upload`,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: InstallPackageByUploadRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => InstallPackageResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      installPackageByUploadHandler
    );

  router.versioned
    .post({
      path: EPM_API_ROUTES.CUSTOM_INTEGRATIONS_PATTERN,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Create a custom integration`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: CreateCustomIntegrationRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => InstallPackageResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      createCustomIntegrationHandler
    );

  router.versioned
    .delete({
      path: EPM_API_ROUTES.DELETE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            FLEET_API_PRIVILEGES.INTEGRATIONS.ALL,
            FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL,
          ],
        },
      },
      summary: `Delete a package`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeletePackageRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => DeletePackageResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },

      deletePackageHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.VERIFICATION_KEY_ID,
      security: READ_PACKAGE_INFO_SECURITY,
      summary: `Get a package signature verification key ID`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetVerificationKeyIdResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getVerificationKeyIdHandler
    );

  router.versioned
    .get({
      path: EPM_API_ROUTES.DATA_STREAMS_PATTERN,
      security: READ_PACKAGE_INFO_SECURITY,
      summary: `Get data streams`,
      options: {
        tags: ['oas-tag:Data streams'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetDataStreamsRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetDataStreamsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getDataStreamsHandler
    );

  router.versioned
    .post({
      path: EPM_API_ROUTES.BULK_ASSETS_PATTERN,
      security: READ_PACKAGE_INFO_SECURITY,
      summary: `Bulk get assets`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetBulkAssetsRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetBulkAssetsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getBulkAssetsHandler
    );

  // Update transforms with es-secondary-authorization headers,
  // append authorized_by to transform's _meta, and start transforms
  router.versioned
    // @ts-ignore TODO move to kibana authz https://github.com/elastic/kibana/issues/203170
    .post({
      path: EPM_API_ROUTES.REAUTHORIZE_TRANSFORMS,
      fleetAuthz: {
        ...INSTALL_PACKAGES_AUTHZ,
        packagePrivileges: {
          transform: {
            actions: {
              canStartStopTransform: {
                executePackageAction: true,
              },
            },
          },
        },
      },
      summary: `Authorize transforms`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: ReauthorizeTransformRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => ReauthorizeTransformResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      reauthorizeTransformsHandler
    );

  router.versioned
    .put({
      path: EPM_API_ROUTES.UPDATE_CUSTOM_INTEGRATIONS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            FLEET_API_PRIVILEGES.SETTINGS.ALL,
            FLEET_API_PRIVILEGES.INTEGRATIONS.ALL,
          ],
        },
      },
      summary: `Update a custom integration`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: CustomIntegrationRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      updateCustomIntegrationHandler
    );

  router.versioned
    .delete({
      path: EPM_API_ROUTES.PACKAGES_DATASTREAM_ASSETS,
      security: INSTALL_PACKAGES_SECURITY,
      summary: `Delete assets for an input package`,
      options: {
        tags: ['oas-tag:Elastic Package Manager (EPM)'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeletePackageDatastreamAssetsRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => DeletePackageDatastreamAssetsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      deletePackageDatastreamAssetsHandler
    );

  if (experimentalFeatures.enablePackageRollback) {
    router.versioned
      .post({
        path: EPM_API_ROUTES.ROLLBACK_PATTERN,
        security: INSTALL_PACKAGES_SECURITY,
        summary: `Rollback a package to previous version`,
        options: {
          tags: ['oas-tag:Elastic Package Manager (EPM)'],
          availability: {
            since: '9.1.0',
            stability: 'experimental',
          },
        },
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          options: {
            oasOperationObject: () => ({
              responses: {
                200: {
                  content: {
                    'application/json': {
                      examples: {
                        successResponse: {
                          value: {
                            version: '1.0.0',
                            success: true,
                          },
                        },
                      },
                    },
                  },
                },
                400: {
                  content: {
                    'application/json': {
                      examples: {
                        badRequestResponse: {
                          value: {
                            message: 'Bad Request',
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
          validate: {
            request: RollbackPackageRequestSchema,
            response: {
              200: {
                description: 'OK: A successful request.',
                body: () => RollbackPackageResponseSchema,
              },
              400: {
                description: 'A bad request.',
                body: genericErrorResponse,
              },
            },
          },
        },
        rollbackPackageHandler
      );

    router.versioned
      .get({
        path: EPM_API_ROUTES.ROLLBACK_AVAILABLE_CHECK_PATTERN,
        security: READ_PACKAGE_INFO_SECURITY,
        summary: `Check if rollback is available for a package`,
        options: {
          tags: ['internal', 'oas-tag:Elastic Package Manager (EPM)'],
        },
        access: 'internal',
      })
      .addVersion(
        {
          version: API_VERSIONS.internal.v1,
          options: {
            oasOperationObject: () => ({
              responses: {
                200: {
                  content: {
                    'application/json': {
                      examples: {
                        successResponse: {
                          value: {
                            reason: 'reason',
                            isAvailable: false,
                          },
                        },
                      },
                    },
                  },
                },
                400: {
                  content: {
                    'application/json': {
                      examples: {
                        badRequestResponse: {
                          value: {
                            message: 'Bad Request',
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
          validate: {
            request: RollbackPackageRequestSchema,
            response: {
              200: {
                description: 'OK: A successful request.',
                body: () => RollbackAvailableCheckResponseSchema,
              },
              400: {
                description: 'A bad request.',
                body: genericErrorResponse,
              },
            },
          },
        },
        rollbackAvailableCheckHandler
      );

    router.versioned
      .get({
        path: EPM_API_ROUTES.BULK_ROLLBACK_AVAILABLE_CHECK_PATTERN,
        security: READ_PACKAGE_INFO_SECURITY,
        summary: `Check if rollback is available for installed packages`,
        options: {
          tags: ['internal', 'oas-tag:Elastic Package Manager (EPM)'],
        },
        access: 'internal',
      })
      .addVersion(
        {
          version: API_VERSIONS.internal.v1,
          options: {
            oasOperationObject: () => ({
              responses: {
                200: {
                  content: {
                    'application/json': {
                      examples: {
                        successResponse: {
                          value: {
                            reason: 'reason',
                            isAvailable: false,
                          },
                        },
                      },
                    },
                  },
                },
                400: {
                  content: {
                    'application/json': {
                      examples: {
                        badRequestResponse: {
                          value: {
                            message: 'Bad Request',
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
          validate: {
            request: {},
            response: {
              200: {
                description: 'OK: A successful request.',
                body: () => BulkRollbackAvailableCheckResponseSchema,
              },
              400: {
                description: 'A bad request.',
                body: genericErrorResponse,
              },
            },
          },
        },
        bulkRollbackAvailableCheckHandler
      );
  }
};
