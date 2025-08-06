/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';

export interface Dimension {
  name: string;
  type: string;
  description?: string;
}

export interface MetricField {
  name: string;
  index: string;
  dimensions: Array<Dimension>;
  type: string;
  time_series_metric?: string;
  unit?: string;
  description?: string;
  source?: string;
  stability?: string;
  display?: string;
  no_data?: boolean;
  fieldCaps?: Record<string, Record<string, FieldCapsFieldCapability>>;
}
