/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Feature } from '@kbn/streams-schema';
import { suggestIntegrations, type PackageSearchProvider } from '@kbn/streams-ai';
import type { FeatureClient } from '../feature/feature_client';
import type {
  IntegrationSuggestion,
  IntegrationSuggestionsResult,
  TechnologyPackageMapping,
} from './types';

/**
 * Minimum confidence threshold for suggesting an integration.
 * Features with confidence below this are ignored.
 */
const MIN_CONFIDENCE_THRESHOLD = 80;

/**
 * Feature types that can be mapped to integrations
 */
const MAPPABLE_FEATURE_TYPES = ['entity', 'technology'];

/**
 * Mapping from technology identifiers to Fleet integration packages.
 * Keys are lowercase technology names (from feature properties).
 * This is a static mapping that can be extended as new integrations are added.
 */
const TECHNOLOGY_PACKAGE_MAPPING: Record<string, TechnologyPackageMapping> = {
  mysql: {
    packageName: 'mysql_otel',
    benefits: [
      'MySQL performance dashboards',
      'Query performance metrics',
      'Connection pool monitoring',
      'Replication status',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/mysql',
  },
  nginx: {
    packageName: 'nginx_otel',
    benefits: [
      'Nginx access and error dashboards',
      'Request rate and latency metrics',
      'Upstream health monitoring',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/nginx',
  },
  postgresql: {
    packageName: 'postgresql_otel',
    aliases: ['postgres'],
    benefits: [
      'PostgreSQL performance dashboards',
      'Query statistics',
      'Connection monitoring',
      'Replication metrics',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/postgresql',
  },
  apache: {
    packageName: 'apache_otel',
    aliases: ['httpd'],
    benefits: [
      'Apache HTTP Server dashboards',
      'Request metrics',
      'Server status monitoring',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/apache',
  },
  redis: {
    packageName: 'redis_otel',
    benefits: [
      'Redis performance dashboards',
      'Memory usage metrics',
      'Key statistics',
      'Command latency',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/redis',
  },
  docker: {
    packageName: 'docker_otel',
    benefits: [
      'Docker container dashboards',
      'Container resource metrics',
      'Image and network stats',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/docker',
  },
  kubernetes: {
    packageName: 'kubernetes_otel',
    aliases: ['k8s'],
    benefits: [
      'Kubernetes cluster overview',
      'Pod and node metrics',
      'Deployment monitoring',
      'Resource utilization',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/kubernetes',
  },
  mongodb: {
    packageName: 'mongodb_otel',
    aliases: ['mongo'],
    benefits: [
      'MongoDB performance dashboards',
      'Query metrics',
      'Replica set status',
      'Operation statistics',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/mongodb',
  },
  elasticsearch: {
    packageName: 'elasticsearch',
    benefits: [
      'Elasticsearch cluster health',
      'Index and shard metrics',
      'JVM and circuit breaker stats',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/elasticsearch',
  },
  kafka: {
    packageName: 'kafka',
    benefits: [
      'Kafka broker dashboards',
      'Topic and consumer group metrics',
      'Producer/consumer lag',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/kafka',
  },
  rabbitmq: {
    packageName: 'rabbitmq',
    benefits: [
      'RabbitMQ overview dashboards',
      'Queue depth metrics',
      'Connection and channel stats',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/rabbitmq',
  },
  iis: {
    packageName: 'iis_otel',
    benefits: [
      'IIS web server dashboards',
      'Request metrics',
      'Application pool stats',
    ],
    docsUrl: 'https://docs.elastic.co/integrations/iis',
  },
};

/**
 * Builds a reverse lookup map from alias to primary technology name
 */
function buildAliasMap(): Map<string, string> {
  const aliasMap = new Map<string, string>();
  for (const [tech, mapping] of Object.entries(TECHNOLOGY_PACKAGE_MAPPING)) {
    aliasMap.set(tech, tech);
    if (mapping.aliases) {
      for (const alias of mapping.aliases) {
        aliasMap.set(alias.toLowerCase(), tech);
      }
    }
  }
  return aliasMap;
}

const ALIAS_MAP = buildAliasMap();

interface IntegrationSuggestionServiceDependencies {
  logger: Logger;
}

/**
 * Service for suggesting Fleet integrations based on detected features in a stream.
 *
 * This service:
 * 1. Retrieves features from the stream with type 'entity' or 'technology'
 * 2. Filters to features with confidence >= 80
 * 3. Extracts technology identifiers from feature properties
 * 4. Matches against known integration packages
 * 5. Retrieves OTel config snippets from Fleet (when available)
 */
export class IntegrationSuggestionService {
  private readonly logger: Logger;

  constructor({ logger }: IntegrationSuggestionServiceDependencies) {
    this.logger = logger;
  }

  /**
   * Gets integration suggestions for a stream based on its detected features.
   *
   * When an inference client and package search provider are available, uses
   * AI-based reasoning to match features to integrations. Otherwise falls back
   * to static mapping.
   */
  async getSuggestions({
    streamName,
    featureClient,
    packageClient,
    inferenceClient,
    packageSearchProvider,
    signal,
  }: {
    streamName: string;
    featureClient: FeatureClient;
    packageClient: PackageClient | undefined;
    inferenceClient?: BoundInferenceClient;
    packageSearchProvider?: PackageSearchProvider;
    signal: AbortSignal;
  }): Promise<IntegrationSuggestionsResult> {
    this.logger.debug(`Getting integration suggestions for stream "${streamName}"`);

    // Get relevant features from the stream
    const features = await this.getRelevantFeatures(streamName, featureClient);

    if (features.length === 0) {
      this.logger.debug(`No relevant features found for stream "${streamName}"`);
      return { streamName, suggestions: [] };
    }

    this.logger.debug(
      `Found ${features.length} relevant feature(s) for stream "${streamName}"`
    );

    // Use AI-based matching if inference client and package search provider are available
    if (inferenceClient && packageSearchProvider) {
      this.logger.debug(`Using AI-based integration matching for stream "${streamName}"`);
      return this.getSuggestionsWithAI({
        streamName,
        features,
        packageClient,
        inferenceClient,
        packageSearchProvider,
        signal,
      });
    }

    // Fall back to static mapping
    this.logger.debug(`Using static mapping for integration matching on stream "${streamName}"`);
    return this.getSuggestionsWithStaticMapping(streamName, features, packageClient);
  }

  /**
   * Gets integration suggestions using AI-based reasoning.
   */
  private async getSuggestionsWithAI({
    streamName,
    features,
    packageClient,
    inferenceClient,
    packageSearchProvider,
    signal,
  }: {
    streamName: string;
    features: Feature[];
    packageClient: PackageClient | undefined;
    inferenceClient: BoundInferenceClient;
    packageSearchProvider: PackageSearchProvider;
    signal: AbortSignal;
  }): Promise<IntegrationSuggestionsResult> {
    try {
      const result = await suggestIntegrations({
        input: { streamName, features },
        inferenceClient,
        packageSearchProvider,
        logger: this.logger,
        signal,
      });

      if (result.error) {
        this.logger.warn(
          `AI integration matching failed for stream "${streamName}": ${result.error}. Falling back to static mapping.`
        );
        return this.getSuggestionsWithStaticMapping(streamName, features, packageClient);
      }

      // Convert AI suggestions to IntegrationSuggestion format and enrich with package info
      const suggestions = await this.enrichAISuggestionsWithPackageInfo(
        result.suggestions,
        features,
        packageClient
      );

      this.logger.debug(
        `AI matching returned ${suggestions.length} integration suggestion(s) for stream "${streamName}"`
      );

      return {
        streamName,
        suggestions: suggestions.sort((a, b) => b.confidence - a.confidence),
      };
    } catch (error) {
      this.logger.error(
        `Error in AI integration matching for stream "${streamName}": ${error}. Falling back to static mapping.`
      );
      return this.getSuggestionsWithStaticMapping(streamName, features, packageClient);
    }
  }

  /**
   * Gets integration suggestions using static technology-to-package mapping.
   */
  private async getSuggestionsWithStaticMapping(
    streamName: string,
    features: Feature[],
    packageClient: PackageClient | undefined
  ): Promise<IntegrationSuggestionsResult> {
    // Match features to integrations using static mapping
    const matchedIntegrations = this.matchFeaturesToIntegrations(features);

    if (matchedIntegrations.length === 0) {
      this.logger.debug(`No integration matches found for stream "${streamName}"`);
      return { streamName, suggestions: [] };
    }

    // Verify packages exist and get OTel configs
    const suggestions = await this.enrichWithPackageInfo(matchedIntegrations, packageClient);

    this.logger.debug(
      `Returning ${suggestions.length} integration suggestion(s) for stream "${streamName}"`
    );

    return {
      streamName,
      suggestions: suggestions.sort((a, b) => b.confidence - a.confidence),
    };
  }

  /**
   * Enriches AI-generated suggestions with package information.
   */
  private async enrichAISuggestionsWithPackageInfo(
    aiSuggestions: Array<{
      packageName: string;
      featureId: string;
      featureTitle: string;
      reason: string;
    }>,
    features: Feature[],
    packageClient: PackageClient | undefined
  ): Promise<IntegrationSuggestion[]> {
    const featureMap = new Map<string, Feature>(features.map((f) => [f.id, f]));

    if (!packageClient) {
      // Without Fleet, return suggestions without package verification or OTel config
      this.logger.debug('Fleet not available, returning AI suggestions without OTel configs');
      return aiSuggestions
        .filter((suggestion) => featureMap.has(suggestion.featureId))
        .map((suggestion) => {
          const feature = featureMap.get(suggestion.featureId)!;
          return {
            packageName: suggestion.packageName,
            packageTitle: this.formatPackageTitle(suggestion.packageName),
            confidence: feature.confidence,
            featureId: suggestion.featureId,
            featureTitle: suggestion.featureTitle,
            benefits: [suggestion.reason],
          };
        });
    }

    // Get available packages to verify and enrich our matches
    const availablePackages = await packageClient.getPackages();
    const packageMap = new Map(availablePackages.map((pkg) => [pkg.name, pkg]));

    const suggestions: IntegrationSuggestion[] = [];

    for (const aiSuggestion of aiSuggestions) {
      const feature = featureMap.get(aiSuggestion.featureId);
      if (!feature) {
        this.logger.debug(
          `Feature "${aiSuggestion.featureId}" not found, skipping suggestion for "${aiSuggestion.packageName}"`
        );
        continue;
      }

      const pkg = packageMap.get(aiSuggestion.packageName);

      // If package doesn't exist, try without _otel suffix as fallback
      const fallbackPackageName = aiSuggestion.packageName.replace(/_otel$/, '');
      const fallbackPkg = !pkg ? packageMap.get(fallbackPackageName) : undefined;

      const resolvedPkg = pkg || fallbackPkg;
      const resolvedPackageName = pkg ? aiSuggestion.packageName : fallbackPackageName;

      if (!resolvedPkg) {
        this.logger.debug(
          `Package "${aiSuggestion.packageName}" not found in registry, skipping AI suggestion`
        );
        continue;
      }

      // Try to get OTel config
      let otelConfig: string | undefined;
      try {
        otelConfig = await this.getOtelConfig(
          packageClient,
          resolvedPackageName,
          resolvedPkg.version
        );
      } catch (error) {
        this.logger.debug(
          `Failed to get OTel config for "${resolvedPackageName}": ${error.message}`
        );
      }

      suggestions.push({
        packageName: resolvedPackageName,
        packageTitle: resolvedPkg.title || this.formatPackageTitle(resolvedPackageName),
        confidence: feature.confidence,
        featureId: aiSuggestion.featureId,
        featureTitle: aiSuggestion.featureTitle,
        otelConfig,
        benefits: [aiSuggestion.reason],
        docsUrl: `https://docs.elastic.co/integrations/${resolvedPackageName.replace(/_otel$/, '')}`,
      });
    }

    return suggestions;
  }

  /**
   * Retrieves features that are relevant for integration matching.
   * Filters to entity/technology types with confidence >= threshold.
   */
  private async getRelevantFeatures(
    streamName: string,
    featureClient: FeatureClient
  ): Promise<Feature[]> {
    const allFeatures: Feature[] = [];

    // Fetch features for each mappable type
    for (const featureType of MAPPABLE_FEATURE_TYPES) {
      const { hits } = await featureClient.getFeatures(streamName, {
        type: [featureType],
      });
      allFeatures.push(...hits);
    }

    // Filter by confidence threshold
    return allFeatures.filter((feature) => feature.confidence >= MIN_CONFIDENCE_THRESHOLD);
  }

  /**
   * Matches features to integration packages based on technology identifiers.
   */
  private matchFeaturesToIntegrations(
    features: Feature[]
  ): Array<{
    feature: Feature;
    technology: string;
    mapping: TechnologyPackageMapping;
  }> {
    const matches: Array<{
      feature: Feature;
      technology: string;
      mapping: TechnologyPackageMapping;
    }> = [];

    // Track which packages we've already matched to avoid duplicates
    const matchedPackages = new Set<string>();

    for (const feature of features) {
      const technologyIds = this.extractTechnologyIdentifiers(feature);

      for (const techId of technologyIds) {
        const normalizedTech = techId.toLowerCase().trim();
        const primaryTech = ALIAS_MAP.get(normalizedTech);

        if (primaryTech && !matchedPackages.has(primaryTech)) {
          const mapping = TECHNOLOGY_PACKAGE_MAPPING[primaryTech];
          matches.push({
            feature,
            technology: primaryTech,
            mapping,
          });
          matchedPackages.add(primaryTech);
        }
      }
    }

    return matches;
  }

  /**
   * Extracts technology identifiers from a feature's properties.
   */
  private extractTechnologyIdentifiers(feature: Feature): string[] {
    const identifiers: string[] = [];
    const { properties } = feature;

    // Check various property keys that might contain technology info
    const techKeys = ['technology', 'name', 'library', 'language', 'engine'];

    for (const key of techKeys) {
      const value = properties[key];
      if (typeof value === 'string' && value.trim()) {
        identifiers.push(value.trim());
      }
    }

    return identifiers;
  }

  /**
   * Enriches matched integrations with package info and OTel config.
   */
  private async enrichWithPackageInfo(
    matches: Array<{
      feature: Feature;
      technology: string;
      mapping: TechnologyPackageMapping;
    }>,
    packageClient: PackageClient | undefined
  ): Promise<IntegrationSuggestion[]> {
    if (!packageClient) {
      // Without Fleet, return suggestions without package verification or OTel config
      this.logger.debug('Fleet not available, returning suggestions without OTel configs');
      return matches.map(({ feature, mapping }) => ({
        packageName: mapping.packageName,
        packageTitle: this.formatPackageTitle(mapping.packageName),
        confidence: feature.confidence,
        featureId: feature.id,
        featureTitle: feature.title || feature.id,
        benefits: mapping.benefits,
        docsUrl: mapping.docsUrl,
      }));
    }

    // Get available packages to verify our matches exist
    const availablePackages = await packageClient.getPackages();
    const packageMap = new Map(availablePackages.map((pkg) => [pkg.name, pkg]));

    const suggestions: IntegrationSuggestion[] = [];

    for (const { feature, mapping } of matches) {
      const pkg = packageMap.get(mapping.packageName);

      // If package doesn't exist, try without _otel suffix as fallback
      const fallbackPackageName = mapping.packageName.replace(/_otel$/, '');
      const fallbackPkg = !pkg ? packageMap.get(fallbackPackageName) : undefined;

      const resolvedPkg = pkg || fallbackPkg;
      const resolvedPackageName = pkg ? mapping.packageName : fallbackPackageName;

      if (!resolvedPkg) {
        this.logger.debug(
          `Package "${mapping.packageName}" not found in registry, skipping suggestion`
        );
        continue;
      }

      // Try to get OTel config
      let otelConfig: string | undefined;
      try {
        otelConfig = await this.getOtelConfig(
          packageClient,
          resolvedPackageName,
          resolvedPkg.version
        );
      } catch (error) {
        this.logger.debug(
          `Failed to get OTel config for "${resolvedPackageName}": ${error.message}`
        );
      }

      suggestions.push({
        packageName: resolvedPackageName,
        packageTitle: resolvedPkg.title || this.formatPackageTitle(resolvedPackageName),
        confidence: feature.confidence,
        featureId: feature.id,
        featureTitle: feature.title || feature.id,
        otelConfig,
        benefits: mapping.benefits,
        docsUrl: mapping.docsUrl,
      });
    }

    return suggestions;
  }

  /**
   * Fetches OTel config YAML for a package using Fleet's getAgentPolicyConfigYAML.
   * Returns undefined if the config doesn't contain OTel-specific sections.
   */
  private async getOtelConfig(
    packageClient: PackageClient,
    packageName: string,
    packageVersion: string
  ): Promise<string | undefined> {
    try {
      const configYaml = await packageClient.getAgentPolicyConfigYAML(
        packageName,
        packageVersion,
        undefined, // isInputIncluded filter
        true, // prerelease
        true // ignoreUnverified
      );

      // Check if this is an OTel config by looking for receivers/service.pipelines
      // If the config doesn't have OTel sections, it's a standard Elastic Agent config
      if (
        configYaml &&
        (configYaml.includes('receivers:') || configYaml.includes('service:'))
      ) {
        return configYaml;
      }

      this.logger.debug(
        `Config for "${packageName}" doesn't appear to be OTel format, skipping`
      );
      return undefined;
    } catch (error) {
      this.logger.debug(`Error fetching config for "${packageName}": ${error.message}`);
      return undefined;
    }
  }

  /**
   * Formats a package name into a human-readable title.
   */
  private formatPackageTitle(packageName: string): string {
    return packageName
      .replace(/_otel$/, ' (OTel)')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
