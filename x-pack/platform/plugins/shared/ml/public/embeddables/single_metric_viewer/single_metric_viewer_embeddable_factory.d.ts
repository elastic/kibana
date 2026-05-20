import type { StartServicesAccessor } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { SingleMetricViewerEmbeddableApi } from '../types';
export declare const getSingleMetricViewerEmbeddableFactory: (getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>, usageCollection?: UsageCollectionSetup) => EmbeddablePublicDefinition<Readonly<{
    id?: string | undefined;
    query?: Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined;
    title?: string | undefined;
    description?: string | undefined;
    filters?: Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    refreshConfig?: Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined;
    forecastId?: string | undefined;
    selectedEntities?: Record<string, string | number | undefined> | undefined;
    functionDescription?: string | undefined;
} & {
    jobIds: string[];
    selectedDetectorIndex: number;
}>, SingleMetricViewerEmbeddableApi>;
