/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type {
  SamplingConfig,
  ConfigureSamplingRequest,
  SamplingConfigResponse,
  SamplingStatusResponse,
} from './types';

/**
 * Service for managing sampling configuration in the .elastic-sampling-config index
 */
export class SamplingConfigService {
  private readonly SAMPLING_INDEX = '.elastic-sampling-config';
  private readonly SAMPLING_DOC_ID = 'streams-sampling';

  /**
   * Enables or updates sampling configuration
   * Maintains a single document with ID 'streams-sampling' in .elastic-sampling-config
   */
  async enableSampling(
    scopedClusterClient: IScopedClusterClient,
    request: ConfigureSamplingRequest
  ): Promise<SamplingConfigResponse> {
    const config: SamplingConfig = {
      enabled: true,
      priority: 50,
      match: {
        stream: '*',
        ...(request.condition && { condition: request.condition }),
      },
      sample_rate: 1,
      updated_at: new Date().toISOString(),
    };

    await scopedClusterClient.asCurrentUser.index({
      index: this.SAMPLING_INDEX,
      id: this.SAMPLING_DOC_ID,
      document: config,
      refresh: 'wait_for',
    });

    return {
      success: true,
      updated_at: config.updated_at,
    };
  }

  /**
   * Retrieves the current sampling configuration status
   */
  async getSamplingStatus(
    scopedClusterClient: IScopedClusterClient
  ): Promise<SamplingStatusResponse | null> {
    try {
      const response = await scopedClusterClient.asCurrentUser.get<SamplingConfig>({
        index: this.SAMPLING_INDEX,
        id: this.SAMPLING_DOC_ID,
      });

      if (!response._source) {
        return null;
      }

      return {
        enabled: response._source.enabled,
        condition: response._source.match.condition,
        updated_at: response._source.updated_at,
        sample_rate: response._source.sample_rate,
      };
    } catch (error) {
      // Document doesn't exist yet
      if ((error as { statusCode?: number }).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Disables sampling by updating the enabled flag to false
   * Keeps the document for audit/history purposes
   */
  async disableSampling(
    scopedClusterClient: IScopedClusterClient
  ): Promise<SamplingConfigResponse> {
    const updatedAt = new Date().toISOString();

    await scopedClusterClient.asCurrentUser.update({
      index: this.SAMPLING_INDEX,
      id: this.SAMPLING_DOC_ID,
      doc: {
        enabled: false,
        updated_at: updatedAt,
      },
      refresh: 'wait_for',
    });

    return {
      success: true,
      updated_at: updatedAt,
    };
  }
}
