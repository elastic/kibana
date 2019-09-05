/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SimpleSavedObject } from 'src/core/public';
import { Workspace } from '.';

// TODO interim type, will be replaced by actual type in parallel pr
type OutlinkEncoder = any;
// TODO interim type, will be replaced by actual type in parallel pr
type FontawesomeIcon = any;

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

export type IndexPatternSavedObject = SimpleSavedObject<{ title: string }>;

export interface AppState {
  urlTemplates: UrlTemplate[];
  advancedSettings: AdvancedSettings;
  workspace: Workspace;
  selectedFields: Field[];
  selectedIndex: IndexPatternSavedObject;
}
