/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '@kbn/deeplinks-analytics/constants';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type { ContentPackDashboard, ContentPackSuggestion } from './types';

/**
 * Extracts the dataset segment from a classic stream name.
 *
 * Classic stream names follow the data stream naming convention: `{type}-{dataset}-{namespace}`
 * For example: `logs-nginx.access-default` → dataset is `nginx.access`
 *              `metrics-hostmetricsreceiver.otel-default` → dataset is `hostmetricsreceiver.otel`
 *
 * @param streamName - The stream name to parse
 * @returns The dataset segment, or null if the stream name doesn't match the expected format
 */
export function extractDatasetFromStreamName(streamName: string): string | null {
  // Classic stream names follow: {type}-{dataset}-{namespace}
  // The dataset can contain dots (e.g., nginx.access, hostmetricsreceiver.otel)
  // We need to split by '-' but the dataset itself may not contain '-'
  const parts = streamName.split('-');

  // Minimum: type-dataset-namespace (3 parts)
  if (parts.length < 3) {
    return null;
  }

  // First part is the type (logs, metrics, traces, synthetics, profiling)
  const validTypes = ['logs', 'metrics', 'traces', 'synthetics', 'profiling'];
  if (!validTypes.includes(parts[0])) {
    return null;
  }

  // Last part is the namespace (often 'default')
  // Everything in between is the dataset
  // For simple cases: logs-nginx-default → dataset = nginx
  // For complex cases: logs-aws.cloudtrail.otel-default → dataset = aws.cloudtrail.otel
  // The dataset is at index 1 in simple cases, but could span multiple '-' separated parts
  // Actually, looking at Fleet's implementation, datasets don't contain dashes,
  // so the dataset is simply parts[1]
  return parts[1];
}

/**
 * Checks if a stream name is a classic stream (data stream format).
 * Wired streams use dot-separated hierarchies and won't match content pack datasets.
 */
export function isClassicStream(streamName: string): boolean {
  return extractDatasetFromStreamName(streamName) !== null;
}

interface ContentPackMatchingServiceDependencies {
  logger: Logger;
}

/**
 * Service for matching Fleet content packages to streams based on dataset discovery mappings.
 *
 * Content packages are auto-installed by Fleet when data is detected for their configured
 * discovery datasets. This service finds dashboards from those installed content packages
 * that match a given stream's dataset.
 */
export class ContentPackMatchingService {
  private readonly logger: Logger;

  constructor({ logger }: ContentPackMatchingServiceDependencies) {
    this.logger = logger;
  }

  /**
   * Gets content pack dashboard suggestions for a stream.
   *
   * @param streamName - The stream name to find suggestions for
   * @param soClient - Saved objects client to resolve dashboard titles
   * @param request - The Kibana request for scoping the package client
   * @returns Content pack suggestion with matched dashboards
   */
  async getSuggestions(
    streamName: string,
    soClient: SavedObjectsClientContract,
    packageClient: PackageClient
  ): Promise<ContentPackSuggestion> {
    const dataset = extractDatasetFromStreamName(streamName);

    if (!dataset) {
      this.logger.debug(
        `Stream "${streamName}" is not a classic stream, cannot match content packs`
      );
      return {
        streamName,
        dataset: '',
        dashboards: [],
      };
    }

    this.logger.debug(`Looking for content pack suggestions for stream "${streamName}", dataset "${dataset}"`);

    try {
      const matchedPackages = await this.findMatchingContentPackages(packageClient, dataset);

      if (matchedPackages.length === 0) {
        this.logger.debug(`No content packages found matching dataset "${dataset}"`);
        return {
          streamName,
          dataset,
          dashboards: [],
        };
      }

      const dashboards = await this.getDashboardsFromPackages(
        packageClient,
        soClient,
        matchedPackages
      );

      this.logger.debug(
        `Found ${dashboards.length} dashboard(s) from ${matchedPackages.length} content package(s) for stream "${streamName}"`
      );

      return {
        streamName,
        dataset,
        dashboards,
      };
    } catch (error) {
      this.logger.error(`Error getting content pack suggestions for stream "${streamName}": ${error.message}`);
      throw error;
    }
  }

  /**
   * Finds content packages that have discovery datasets matching the given dataset.
   */
  private async findMatchingContentPackages(
    packageClient: PackageClient,
    dataset: string
  ): Promise<PackageListItem[]> {
    const allPackages = await packageClient.getPackages();

    // Filter to installed content packages with matching discovery datasets
    return allPackages.filter((pkg) => {
      // Must be a content package
      if (pkg.type !== 'content') {
        return false;
      }

      // Must be installed
      if (pkg.status !== 'installed') {
        return false;
      }

      // Must have discovery datasets that match
      const discoveryDatasets = pkg.discovery?.datasets;
      if (!discoveryDatasets || discoveryDatasets.length === 0) {
        return false;
      }

      return discoveryDatasets.some((ds) => ds.name === dataset);
    });
  }

  /**
   * Gets dashboard information from the given packages.
   */
  private async getDashboardsFromPackages(
    packageClient: PackageClient,
    soClient: SavedObjectsClientContract,
    packages: PackageListItem[]
  ): Promise<ContentPackDashboard[]> {
    const allDashboards: ContentPackDashboard[] = [];

    for (const pkg of packages) {
      const dashboards = await this.getDashboardsFromPackage(packageClient, soClient, pkg);
      allDashboards.push(...dashboards);
    }

    return allDashboards;
  }

  /**
   * Gets dashboard information from a single package.
   */
  private async getDashboardsFromPackage(
    packageClient: PackageClient,
    soClient: SavedObjectsClientContract,
    pkg: PackageListItem
  ): Promise<ContentPackDashboard[]> {
    try {
      const installation = await packageClient.getInstallation(pkg.name);
      if (!installation) {
        this.logger.debug(`Package "${pkg.name}" has no installation info`);
        return [];
      }

      // Extract dashboard IDs from installed_kibana
      const dashboardIds = installation.installed_kibana
        .filter((asset) => asset.type === DASHBOARD_SAVED_OBJECT_TYPE)
        .map((asset) => asset.id);

      if (dashboardIds.length === 0) {
        this.logger.debug(`Package "${pkg.name}" has no installed dashboards`);
        return [];
      }

      // Fetch dashboard titles
      const dashboardSavedObjects = await soClient.bulkGet<{ title?: string }>(
        dashboardIds.map((id) => ({
          id,
          type: DASHBOARD_SAVED_OBJECT_TYPE,
          fields: ['title'],
        }))
      );

      // Build dashboard results, ignoring any that errored
      return dashboardSavedObjects.saved_objects
        .filter((so) => !so.error)
        .map((so) => ({
          id: so.id,
          title: so.attributes.title || so.id,
          packageName: pkg.name,
          packageTitle: pkg.title,
          packageVersion: pkg.version,
        }));
    } catch (error) {
      this.logger.warn(
        `Error getting dashboards from package "${pkg.name}": ${error.message}`
      );
      return [];
    }
  }
}
