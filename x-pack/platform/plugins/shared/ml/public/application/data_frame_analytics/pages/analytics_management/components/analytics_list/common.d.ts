import type { EuiTableActionsColumnType, Ast } from '@elastic/eui';
import { Query } from '@elastic/eui';
import { type DataFrameAnalyticsId, type DataFrameAnalyticsConfig, type DataFrameAnalysisConfigType, type DataFrameAnalyticsStats, type DataFrameTaskStateType } from '@kbn/ml-data-frame-analytics-utils';
export declare enum DATA_FRAME_MODE {
    BATCH = "batch",
    CONTINUOUS = "continuous"
}
export { Query };
export type Clause = Parameters<(typeof Query)['isMust']>[0];
type ExtractClauseType<T> = T extends (x: any) => x is infer Type ? Type : never;
export type TermClause = ExtractClauseType<(typeof Ast)['Term']['isInstance']>;
export type FieldClause = ExtractClauseType<(typeof Ast)['Field']['isInstance']>;
export type Value = Parameters<(typeof Ast)['Term']['must']>[0];
export declare function isDataFrameAnalyticsFailed(state: DataFrameTaskStateType): state is "failed";
export declare function isDataFrameAnalyticsRunning(state: DataFrameTaskStateType): state is "started" | "starting" | "analyzing" | "reindexing";
export declare function isDataFrameAnalyticsStopped(state: DataFrameTaskStateType): state is "stopped";
export declare function isDataFrameAnalyticsStats(arg: any): arg is DataFrameAnalyticsStats;
export declare function getDataFrameAnalyticsProgress(stats: DataFrameAnalyticsStats): number | undefined;
export declare function getDataFrameAnalyticsProgressPhase(stats: DataFrameAnalyticsStats): {
    currentPhase: number;
    progress: number;
    totalPhases: number;
};
export interface DataFrameAnalyticsListRow {
    checkpointing: object;
    config: DataFrameAnalyticsConfig;
    id: DataFrameAnalyticsId;
    job_type: DataFrameAnalysisConfigType;
    mode: string;
    state: DataFrameAnalyticsStats['state'];
    stats: DataFrameAnalyticsStats;
    spaces?: string[];
}
export declare const DataFrameAnalyticsListColumn: {
    readonly configDestIndex: "config.dest.index";
    readonly configSourceIndex: "config.source.index";
    readonly configCreateTime: "config.create_time";
    readonly description: "config.description";
    readonly id: "id";
    readonly memoryStatus: "stats.memory_usage.status";
};
export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;
export declare function isCompletedAnalyticsJob(stats: DataFrameAnalyticsStats): boolean;
type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];
export type DataFrameAnalyticsListAction = ArrayElement<EuiTableActionsColumnType<DataFrameAnalyticsListRow>['actions']>;
