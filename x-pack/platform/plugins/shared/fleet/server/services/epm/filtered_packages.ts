/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';
import {
  FLEET_SERVER_PACKAGE,
  SEARCH_AI_LAKE_PACKAGES,
  SEARCH_AI_LAKE_ALLOWED_INSTALL_PACKAGES,
} from '../../../common/constants';

export function getFilteredSearchPackages() {
  const isElasticConnectorsServerlessEnabled = getElasticConnectorsServerlessEnabled();
  const shouldFilterFleetServer = appContextService.getConfig()?.internal?.fleetServerStandalone;
  const filtered: string[] = ['profiler_collector', 'profiler_symbolizer'];
  if (!isElasticConnectorsServerlessEnabled) {
    filtered.push('elastic_connectors');
  }
  // Do not allow to search for Fleet server integration if configured to use  standalone fleet server
  if (shouldFilterFleetServer) {
    filtered.push(FLEET_SERVER_PACKAGE);
  }

  const excludePackages = appContextService.getConfig()?.internal?.registry?.excludePackages ?? [];

  return filtered.concat(excludePackages);
}

export function getFilteredInstallPackages() {
  const isElasticConnectorsServerlessEnabled = getElasticConnectorsServerlessEnabled();
  const filtered: string[] = [];
  if (!isElasticConnectorsServerlessEnabled) {
    filtered.push('elastic_connectors');
  }

  const excludePackages = appContextService.getConfig()?.internal?.registry?.excludePackages ?? [];

  return filtered.concat(excludePackages);
}

export function getAllowedSearchAiLakeInstallPackagesIfEnabled() {
  const enabled =
    appContextService.getConfig()?.internal?.registry?.searchAiLakePackageAllowlistEnabled;
  return enabled
    ? SEARCH_AI_LAKE_PACKAGES.concat(SEARCH_AI_LAKE_ALLOWED_INSTALL_PACKAGES)
    : undefined;
}

export function getElasticConnectorsServerlessEnabled() {
  const ELASTIC_CONNECTORS_SERVERLESS_PROJECT_TYPES = ['security', 'observability'];

  const cloud = appContextService.getCloud();

  return (
    // is cloud and not serverless
    (cloud?.isCloudEnabled && !cloud?.isServerlessEnabled) ||
    // is serverless and project type is one of the supported
    (cloud?.isServerlessEnabled &&
      ELASTIC_CONNECTORS_SERVERLESS_PROJECT_TYPES.includes(
        appContextService.getCloud()?.serverless.projectType ?? ''
      ))
  );
}
