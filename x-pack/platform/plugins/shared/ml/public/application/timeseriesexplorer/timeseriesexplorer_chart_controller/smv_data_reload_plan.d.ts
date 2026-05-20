/**
 * Minimal props snapshot for “should we reload SMV context data?” decisions.
 * Built via {@link smvReloadSnapshotFromSmvHostProps} before calling {@link getSmvDataReloadPlan}.
 */
export interface SmvDataReloadSnapshot {
    bounds: unknown;
    lastRefresh: number;
    selectedDetectorIndex: unknown;
    selectedEntities: unknown;
    selectedForecastId: string | undefined;
    selectedJobId: string | undefined;
    /**
     * When the host keeps a full `selectedJob` object (embeddable), include its `job_id`
     * so a materialized job change is detected even if `selectedJobId` stayed in sync.
     */
    materializedJobId?: string;
    functionDescription: unknown;
}
export interface SmvDataReloadPlan {
    shouldReload: boolean;
    fullRefresh: boolean;
}
/**
 * Pure reload rules shared by full-page {@link TimeSeriesExplorer} and
 * {@link TimeSeriesExplorerEmbeddableChart} `componentDidUpdate` logic.
 *
 * - **lastRefresh** alone triggers a reload with **fullRefresh false** (soft refresh),
 *   except when `previous.lastRefresh === 0` (avoids duplicate load on first paint).
 * - **fullRefresh** mirrors the legacy subset: bounds / detector / entities / forecast /
 *   job identity / function description (not lastRefresh-only ticks).
 */
export declare function getSmvDataReloadPlan(previous: SmvDataReloadSnapshot | undefined, next: SmvDataReloadSnapshot): SmvDataReloadPlan;
/**
 * Props slice read by SMV hosts for reload decisions.
 * Pass optional `selectedJob` (embeddable) so {@link SmvDataReloadSnapshot#materializedJobId}
 * participates in job identity; omit on full-page SMV (`selectedJobId` only).
 */
export interface SmvReloadHostPropsInput {
    bounds: unknown;
    lastRefresh: number;
    selectedDetectorIndex: unknown;
    selectedEntities: unknown;
    selectedForecastId: string | undefined;
    selectedJobId: string;
    functionDescription: unknown;
    selectedJob?: {
        job_id?: string;
    };
}
export declare function smvReloadSnapshotFromSmvHostProps(props: SmvReloadHostPropsInput): SmvDataReloadSnapshot;
