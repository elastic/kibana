import type { DeprecationsDetails } from '@kbn/core-deprecations-common';
import type { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import type { Space } from '@kbn/spaces-plugin/common';
import type { LogsSharedPluginStartServicesAccessor } from '../types';
export interface LogSourcesSettingDeprecationParams {
    context: GetDeprecationsContext;
    getStartServices: LogsSharedPluginStartServicesAccessor;
}
export declare const getLogSourcesSettingDeprecationInfo: (params: LogSourcesSettingDeprecationParams) => Promise<DeprecationsDetails[]>;
export declare const getLogSourcesSettingDeprecationInfoForSpaceFactory: ({ getStartServices, context, }: LogSourcesSettingDeprecationParams) => ((space: Space) => Promise<string | undefined>);
