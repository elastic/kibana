/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FontawesomeIcon } from '../services/style_choices';
import { OutlinkEncoder } from '../services/outlink_encoders';

export interface UrlTemplate {
  url: string;
  description: string;
  icon: FontawesomeIcon | null;
  encoder: OutlinkEncoder;
  isDefault?: boolean;
}

export interface Field {
  name: string;
  hopSize?: number;
  lastValidHopSize?: number; // TODO handle this by an "active" flag
  color: string;
  icon: FontawesomeIcon;
}

export interface AdvancedSettings {
  sampleSize: number;
  useSignificance: boolean;
  minDocCount: number;
  sampleDiversityField?: Field;
  maxValuesPerDoc: number;
  timeoutMillis: number;
}
