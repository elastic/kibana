/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { DataView, DataViewAttributes } from '@kbn/data-views-plugin/public';
import type { GenericIcon } from '../helpers/style_choices';
import type { OutlinkEncoder } from '../helpers/outlink_encoders';

export interface UrlTemplate {
  url: string;
  description: string;
  icon: GenericIcon | null;
  encoder: OutlinkEncoder;
  isDefault?: boolean;
}

export interface WorkspaceField {
  name: string;
  hopSize?: number;
  lastValidHopSize?: number; // TODO handle this by an "active" flag
  color: string;
  icon: GenericIcon;
  selected: boolean;
  type: string;
  aggregatable: boolean;
}

export interface AdvancedSettings {
  sampleSize: number;
  useSignificance: boolean;
  minDocCount: number;
  sampleDiversityField?: WorkspaceField;
  maxValuesPerDoc: number;
  timeoutMillis: number;
}

export type IndexPatternSavedObject = SavedObject<DataViewAttributes>;

export interface IndexPatternProvider {
  get(id: string): Promise<DataView>;
}
