/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaFeatureConfig,
  SubFeatureConfig,
  SubFeaturePrivilegeConfig,
} from '@kbn/features-plugin/common';
import type { RecursivePartial } from '@kbn/utility-types';
import type {
  AppFeatureAssistantKey,
  AppFeatureCasesKey,
  AppFeatureKeyType,
  AppFeatureSecurityKey,
  AssistantSubFeatureId,
  CasesSubFeatureId,
  SecuritySubFeatureId,
} from './app_features_keys';

export type { AppFeatureKeyType };
export type AppFeatureKeys = AppFeatureKeyType[];

// Features types
export type BaseKibanaFeatureConfig = Omit<KibanaFeatureConfig, 'subFeatures'>;
export type SubFeaturesPrivileges = RecursivePartial<SubFeaturePrivilegeConfig>;
export type AppFeatureKibanaConfig<T extends string = string> =
  RecursivePartial<BaseKibanaFeatureConfig> & {
    subFeatureIds?: T[];
    subFeaturesPrivileges?: SubFeaturesPrivileges[];
  };
export type AppFeaturesConfig<T extends string = string> = Map<
  AppFeatureKeyType,
  AppFeatureKibanaConfig<T>
>;

export type AppFeaturesSecurityConfig = Map<
  AppFeatureSecurityKey,
  AppFeatureKibanaConfig<SecuritySubFeatureId>
>;
export type AppFeaturesCasesConfig = Map<
  AppFeatureCasesKey,
  AppFeatureKibanaConfig<CasesSubFeatureId>
>;

export type AppFeaturesAssistantConfig = Map<
  AppFeatureAssistantKey,
  AppFeatureKibanaConfig<AssistantSubFeatureId>
>;

export type AppSubFeaturesMap<T extends string = string> = Map<T, SubFeatureConfig>;

export interface AppFeatureParams<T extends string = string> {
  baseKibanaFeature: BaseKibanaFeatureConfig;
  baseKibanaSubFeatureIds: T[];
  subFeaturesMap: AppSubFeaturesMap<T>;
}
