/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';

import { Dependencies } from './types';
import { ELASTICSEARCH_FEATURE, KIBANA_FEATURE } from './features';

export class DataQualityPlugin implements Plugin<void, void, any, any> {
  public setup(_coreSetup: CoreSetup, { features }: Dependencies) {
    features.registerKibanaFeature(KIBANA_FEATURE);
    features.registerElasticsearchFeature(ELASTICSEARCH_FEATURE);
  }

  public start() {}

  public stop() {}
}
