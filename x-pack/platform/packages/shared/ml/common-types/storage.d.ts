import type { MlEntityFieldType } from '@kbn/ml-anomaly-utils';
import type { FrozenTierPreference } from '@kbn/ml-date-picker';
import type { StartAllocationParams } from './trained_models';
export declare const ML_ENTITY_FIELDS_CONFIG: "ml.singleMetricViewer.partitionFields";
export declare const ML_APPLY_TIME_RANGE_CONFIG = "ml.jobSelectorFlyout.applyTimeRange";
export declare const ML_GETTING_STARTED_CALLOUT_DISMISSED = "ml.gettingStarted.isDismissed";
export declare const ML_FROZEN_TIER_PREFERENCE = "ml.frozenDataTierPreference";
export declare const ML_ANOMALY_EXPLORER_PANELS = "ml.anomalyExplorerPanels";
export declare const ML_NOTIFICATIONS_LAST_CHECKED_AT = "ml.notificationsLastCheckedAt";
export declare const ML_OVERVIEW_PANELS = "ml.overviewPanels";
export declare const ML_OVERVIEW_PANELS_EXTENDED = "ml.overviewPanelsExtended";
export declare const ML_ELSER_CALLOUT_DISMISSED = "ml.elserUpdateCalloutDismissed";
export declare const ML_SCHEDULED_MODEL_DEPLOYMENTS = "ml.trainedModels.scheduledModelDeployments";
export type PartitionFieldConfig = {
    /**
     * Relevant for jobs with enabled model plot.
     * If true, entity values are based on records with anomalies.
     * Otherwise aggregated from the model plot results.
     */
    anomalousOnly: boolean;
    /**
     * Relevant for jobs with disabled model plot.
     * If true, entity values are filtered by the active time range.
     * If false, the lists consist of the values from all existing records.
     */
    applyTimeRange: boolean;
    sort: {
        by: 'anomaly_score' | 'name';
        order: 'asc' | 'desc';
    };
    value: string;
} | undefined;
export type PartitionFieldsConfig = Partial<Record<MlEntityFieldType, PartitionFieldConfig>> | undefined;
export type ApplyTimeRangeConfig = boolean | undefined;
export interface PanelState {
    size: number;
    isCollapsed: boolean;
}
export interface AnomalyExplorerPanelsState {
    topInfluencers: PanelState;
    mainPage: {
        size: number;
    };
}
export interface OverviewPanelsState {
    nodes: boolean;
    adJobs: boolean;
    dfaJobs: boolean;
}
export interface OverviewPanelsExtendedState {
    memoryUsage: boolean;
}
export interface MlStorageRecord {
    [key: string]: unknown;
    [ML_ENTITY_FIELDS_CONFIG]: PartitionFieldsConfig;
    [ML_APPLY_TIME_RANGE_CONFIG]: ApplyTimeRangeConfig;
    [ML_GETTING_STARTED_CALLOUT_DISMISSED]: boolean | undefined;
    [ML_FROZEN_TIER_PREFERENCE]: FrozenTierPreference;
    [ML_ANOMALY_EXPLORER_PANELS]: AnomalyExplorerPanelsState | undefined;
    [ML_NOTIFICATIONS_LAST_CHECKED_AT]: number | undefined;
    [ML_OVERVIEW_PANELS]: OverviewPanelsState;
    [ML_OVERVIEW_PANELS_EXTENDED]: OverviewPanelsExtendedState;
    [ML_ELSER_CALLOUT_DISMISSED]: boolean | undefined;
    [ML_SCHEDULED_MODEL_DEPLOYMENTS]: StartAllocationParams[];
}
export type MlStorage = Partial<MlStorageRecord> | null;
export type MlStorageKey = keyof Exclude<MlStorage, null>;
export type TMlStorageMapped<T extends MlStorageKey> = T extends typeof ML_ENTITY_FIELDS_CONFIG ? PartitionFieldsConfig : T extends typeof ML_APPLY_TIME_RANGE_CONFIG ? ApplyTimeRangeConfig : T extends typeof ML_GETTING_STARTED_CALLOUT_DISMISSED ? boolean | undefined : T extends typeof ML_FROZEN_TIER_PREFERENCE ? FrozenTierPreference | undefined : T extends typeof ML_ANOMALY_EXPLORER_PANELS ? AnomalyExplorerPanelsState | undefined : T extends typeof ML_NOTIFICATIONS_LAST_CHECKED_AT ? number | undefined : T extends typeof ML_OVERVIEW_PANELS ? OverviewPanelsState | undefined : T extends typeof ML_OVERVIEW_PANELS_EXTENDED ? OverviewPanelsExtendedState | undefined : T extends typeof ML_ELSER_CALLOUT_DISMISSED ? boolean | undefined : T extends typeof ML_SCHEDULED_MODEL_DEPLOYMENTS ? string[] | undefined : null;
export declare const ML_STORAGE_KEYS: readonly ["ml.singleMetricViewer.partitionFields", "ml.jobSelectorFlyout.applyTimeRange", "ml.gettingStarted.isDismissed", "ml.frozenDataTierPreference", "ml.anomalyExplorerPanels", "ml.notificationsLastCheckedAt", "ml.overviewPanels", "ml.overviewPanelsExtended", "ml.elserUpdateCalloutDismissed", "ml.trainedModels.scheduledModelDeployments"];
