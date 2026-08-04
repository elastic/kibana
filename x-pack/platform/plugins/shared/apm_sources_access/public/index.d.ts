import type { PluginInitializer } from '@kbn/core/public';
import { type ApmSourceAccessPluginSetup, type ApmSourceAccessPluginStart } from './plugin';
export declare const plugin: PluginInitializer<ApmSourceAccessPluginSetup, ApmSourceAccessPluginStart>;
export type { ApmSourceAccessPluginStart, ApmSourceAccessPluginSetup };
export { APM_INDEX_PATTERN_MAX_LENGTH, validateApmIndexSetting, validateApmIndices, } from '../common/apm_indices_validation';
export type { ApmIndexSettingKey, ApmIndexValidationErrors, ApmIndexValidationIssue, ApmIndexValidationValues, } from '../common/apm_indices_validation';
export type { APMIndices } from '../common/config_schema';
export { callSourcesAPI, type SourcesApiOptions } from './api';
