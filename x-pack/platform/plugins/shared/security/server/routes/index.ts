/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type { BuildFlavor } from '@kbn/config/src/types';
import type { DocLinksServiceSetup, HttpResources, IBasePath, Logger } from '@kbn/core/server';
import type { KibanaFeature } from '@kbn/features-plugin/server';
import type { SubFeaturePrivilegeIterator } from '@kbn/features-plugin/server/feature_privilege_iterator';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { defineAnalyticsRoutes } from './analytics';
import { defineAnonymousAccessRoutes } from './anonymous_access';
import { defineApiKeysRoutes } from './api_keys';
import { defineAuthenticationRoutes } from './authentication';
import { defineAuthorizationRoutes } from './authorization';
import { defineDeprecationsRoutes } from './deprecations';
import { defineSecurityFeatureRoutes } from './feature_check';
import { defineIndicesRoutes } from './indices';
import { defineRoleMappingRoutes } from './role_mapping';
import { defineSecurityCheckupGetStateRoutes } from './security_checkup';
import { defineSessionManagementRoutes } from './session_management';
import { defineUserProfileRoutes } from './user_profile';
import { defineUsersRoutes } from './users';
import { defineViewRoutes } from './views';
import type { SecurityLicense } from '../../common';
import type { AnalyticsServiceSetup } from '../analytics';
import type { AnonymousAccessServiceStart } from '../anonymous_access';
import type { InternalAuthenticationServiceStart } from '../authentication';
import type { AuthorizationServiceSetupInternal } from '../authorization';
import type { ConfigType } from '../config';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import type { Session } from '../session_management';
import type { SecurityRouter } from '../types';
import type { UserProfileServiceStartInternal } from '../user_profile';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  router: SecurityRouter;
  basePath: IBasePath;
  httpResources: HttpResources;
  logger: Logger;
  config: ConfigType;
  config$: Observable<ConfigType>;
  authz: AuthorizationServiceSetupInternal;
  getSession: () => PublicMethodsOf<Session>;
  license: SecurityLicense;
  getFeatures: () => Promise<KibanaFeature[]>;
  subFeaturePrivilegeIterator: SubFeaturePrivilegeIterator;
  getFeatureUsageService: () => SecurityFeatureUsageServiceStart;
  getAuthenticationService: () => InternalAuthenticationServiceStart;
  getUserProfileService: () => UserProfileServiceStartInternal;
  getAnonymousAccessService: () => AnonymousAccessServiceStart;
  analyticsService: AnalyticsServiceSetup;
  buildFlavor: BuildFlavor;
  docLinks: DocLinksServiceSetup;
}

export function defineRoutes(params: RouteDefinitionParams) {
  defineAnalyticsRoutes(params);
  defineApiKeysRoutes(params);
  defineAuthenticationRoutes(params);
  defineAuthorizationRoutes(params);
  defineSessionManagementRoutes(params);
  defineUserProfileRoutes(params);
  defineUsersRoutes(params); // Temporarily allow user APIs (ToDo: move to non-serverless block below)
  defineViewRoutes(params);

  // In the serverless environment...
  if (params.buildFlavor !== 'serverless') {
    defineAnonymousAccessRoutes(params); // anonymous access is disabled
    defineDeprecationsRoutes(params); // deprecated kibana user roles are not applicable, these HTTP APIs are not needed
    defineIndicesRoutes(params); // the ES privileges form used to help define roles (only consumer) is disabled, so there is no need for these HTTP APIs
    defineRoleMappingRoutes(params); // role mappings are managed internally, based on configurations in control plane, these HTTP APIs are not needed
    defineSecurityFeatureRoutes(params);
    defineSecurityCheckupGetStateRoutes(params); // security checkup is not applicable, these HTTP APIs are not needed
    // defineUsersRoutes(params); // the native realm is not enabled (there is only Elastic cloud SAML), no user HTTP API routes are needed
  }
}
