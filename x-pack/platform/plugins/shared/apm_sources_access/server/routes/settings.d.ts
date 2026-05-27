import type { CoreSetup } from '@kbn/core/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { ApmSourcesAccessPlugin } from '../plugin';
import type { APMIndices } from '..';
export interface APMSourcesRouteHandlerResources extends DefaultRouteHandlerResources {
    sources: ReturnType<ApmSourcesAccessPlugin['setup']>;
}
export interface APMSourcesCore {
    setup: CoreSetup;
}
export interface ApmIndexSettingsResponse {
    apmIndexSettings: Array<{
        configurationName: keyof APMIndices;
        defaultValue: string;
        savedValue: string | undefined;
    }>;
}
export declare function getApmIndices({ sources, context, }: APMSourcesRouteHandlerResources): Promise<APMIndices>;
export declare function getApmIndexSettings({ sources, context, }: APMSourcesRouteHandlerResources): Promise<ApmIndexSettingsResponse>;
