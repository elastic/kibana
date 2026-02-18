/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { PackageSearchProvider, IntegrationPackageInfo } from '@kbn/streams-ai';

/**
 * Implementation of PackageSearchProvider that uses Fleet's PackageClient
 * to search and list available integration packages.
 */
export class FleetPackageSearchProvider implements PackageSearchProvider {
  private readonly packageClient: PackageClient;
  private readonly logger: Logger;

  constructor({
    packageClient,
    logger,
  }: {
    packageClient: PackageClient;
    logger: Logger;
  }) {
    this.packageClient = packageClient;
    this.logger = logger;
  }

  /**
   * Searches for integration packages matching the given search term.
   * If no search term is provided, returns all available packages.
   *
   * Note: Fleet's getPackages doesn't support text search, so we fetch all
   * packages and filter client-side. For large registries, this could be
   * optimized by implementing server-side search.
   */
  async searchPackages(searchTerm?: string): Promise<IntegrationPackageInfo[]> {
    this.logger.debug(
      `[FleetPackageSearchProvider] Searching packages${searchTerm ? ` with term: "${searchTerm}"` : ''}`
    );

    try {
      const packages = await this.packageClient.getPackages({
        prerelease: true,
      });

      let filteredPackages = packages;

      if (searchTerm) {
        const normalizedSearch = searchTerm.toLowerCase().trim();

        filteredPackages = packages.filter((pkg) => {
          const nameMatch = pkg.name.toLowerCase().includes(normalizedSearch);
          const titleMatch = pkg.title?.toLowerCase().includes(normalizedSearch);
          const descriptionMatch = pkg.description?.toLowerCase().includes(normalizedSearch);
          const categoryMatch = pkg.categories?.some(
            (cat) => cat && cat.toLowerCase().includes(normalizedSearch)
          );

          return nameMatch || titleMatch || descriptionMatch || categoryMatch;
        });
      }

      const results: IntegrationPackageInfo[] = filteredPackages.map((pkg) => {
        const categories = pkg.categories
          ?.filter((cat): cat is NonNullable<typeof cat> => cat !== undefined)
          .map((cat) => String(cat));
        return {
          name: pkg.name,
          title: pkg.title || pkg.name,
          description: pkg.description,
          version: pkg.version,
          categories,
        };
      });

      this.logger.debug(
        `[FleetPackageSearchProvider] Found ${results.length} packages${searchTerm ? ` matching "${searchTerm}"` : ''}`
      );

      return results;
    } catch (error) {
      this.logger.error(`[FleetPackageSearchProvider] Error searching packages: ${error}`);
      throw error;
    }
  }
}
