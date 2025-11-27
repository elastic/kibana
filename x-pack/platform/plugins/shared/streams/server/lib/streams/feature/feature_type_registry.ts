/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';
import { describeDataset } from '@kbn/ai-tools';
import type { IdentifyFeaturesOptions } from '@kbn/streams-ai';
import type { FeatureTypeHandler } from './feature_type_handler';
import type { StoredFeature } from './stored_feature';
import { SystemFeatureHandler } from './handlers/system';
import { FEATURE_TYPE } from './fields';

export class FeatureTypeRegistry {
  private handlers = new Map<string, FeatureTypeHandler>();

  register(handler: FeatureTypeHandler): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Feature type handler for type "${handler.type}" is already registered`);
    }
    this.handlers.set(handler.type, handler);
  }

  unregister(type: string): boolean {
    return this.handlers.delete(type);
  }

  getHandler(type: string): FeatureTypeHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No feature type handler registered for type "${type}"`);
    }
    return handler;
  }

  hasHandler(type: string): boolean {
    return this.handlers.has(type);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  fromStorage(stored: StoredFeature): Feature {
    const type = stored[FEATURE_TYPE];
    const handler = this.getHandler(type);
    return handler.fromStorage(stored);
  }

  toStorage(streamName: string, feature: Feature): StoredFeature {
    const handler = this.getHandler(feature.type);
    return handler.toStorage(streamName, feature);
  }

  async identifyFeatures(
    options: Omit<IdentifyFeaturesOptions, 'analysis'>
  ): Promise<{ features: Feature[] }> {
    const analysis = await describeDataset({
      start: options.start,
      end: options.end,
      esClient: options.esClient,
      index: options.stream.name,
    });

    const features: Feature[] = [];
    for (const handler of this.handlers.values()) {
      const result = await handler.identifyFeatures({
        ...options,
        analysis,
      });

      features.push(...result.features);
    }

    return { features };
  }
}

const defaultRegistry = new FeatureTypeRegistry();
defaultRegistry.register(new SystemFeatureHandler());

export function getDefaultFeatureRegistry() {
  return defaultRegistry;
}
