/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { KibanaFeatureConfig, KibanaFeature } from '.';

export class FeaturesAPIClient {
  constructor(private readonly http: HttpSetup) {}

  public async getFeatures() {
    const features = await this.http.get<KibanaFeatureConfig[]>('/api/features');
    return features.map((config) => new KibanaFeature(config));
  }
}
