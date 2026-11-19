/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamsStatsClient } from '@kbn/dataset-quality-plugin/public';
import type { StreamsTelemetryClient } from '../telemetry/client';
import type { ComponentCatalogueClient } from './component_catalogue/types';

export interface StreamsAppServices {
  dataStreamsClient: Promise<IDataStreamsStatsClient>;
  telemetryClient: StreamsTelemetryClient;
  /** The distributor's component catalogue, memoised for the app session. */
  componentCatalogue: ComponentCatalogueClient;
  version: string;
}
