/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../common/experimental_features';

export class ExperimentalFeaturesService {
  private static experimentalFeatures?: ExperimentalFeatures;

  public static init(experimentalFeatures: ExperimentalFeatures) {
    this.experimentalFeatures = experimentalFeatures;
  }

  public static get(): ExperimentalFeatures {
    if (!this.experimentalFeatures) {
      this.throwUninitializedError();
    }

    return this.experimentalFeatures;
  }

  private static throwUninitializedError(): never {
    throw new Error('Experimental features service not initialized');
  }
}
