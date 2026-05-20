import type { StartServicesAccessor } from '@kbn/core/public';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { AnomalyChartsEmbeddableApi } from '..';
export declare const getAnomalyChartsReactEmbeddableFactory: (getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>, usageCollection?: UsageCollectionSetup) => EmbeddablePublicDefinition<Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    severityThreshold?: Readonly<{
        max?: number | undefined;
    } & {
        min: number;
    }>[] | undefined;
    selectedEntities?: Readonly<{
        fieldType?: import("@kbn/ml-anomaly-utils").ML_ENTITY_FIELD_TYPE | undefined;
        cardinality?: number | undefined;
        operation?: "+" | "-" | undefined;
        fieldValue?: string | number | undefined;
    } & {
        fieldName: string;
    }>[] | undefined;
} & {
    jobIds: string[];
    maxSeriesToPlot: number;
}>, AnomalyChartsEmbeddableApi>;
