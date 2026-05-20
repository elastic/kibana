import type { StartServicesAccessor } from '@kbn/core/public';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { AnomalySwimlaneEmbeddableServices } from '..';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { AnomalySwimLaneEmbeddableApi } from './types';
/**
 * Provides the services required by the Anomaly Swimlane Embeddable.
 */
export declare const getServices: (getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>) => Promise<AnomalySwimlaneEmbeddableServices>;
export declare const getAnomalySwimLaneEmbeddableFactory: (getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>) => EmbeddablePublicDefinition<Readonly<{
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
    perPage?: number | undefined;
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
} & {
    jobIds: string[];
    viewBy: string;
    swimlaneType: "viewBy";
}> | Readonly<{
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
    perPage?: number | undefined;
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
} & {
    jobIds: string[];
    swimlaneType: "overall";
}>, AnomalySwimLaneEmbeddableApi>;
