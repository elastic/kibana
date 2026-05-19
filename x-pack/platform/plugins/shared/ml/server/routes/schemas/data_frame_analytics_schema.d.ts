import type { CreateDataViewApiResponseSchema } from '@kbn/ml-data-view-utils/types/api_create_response_schema';
export declare const dataFrameAnalyticsJobConfigSchema: import("@kbn/config-schema").ObjectType<{
    description: import("@kbn/config-schema").Type<string | undefined>;
    _meta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    dest: import("@kbn/config-schema").ObjectType<{
        index: import("@kbn/config-schema").Type<string>;
        results_field: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    source: import("@kbn/config-schema").ObjectType<{
        index: import("@kbn/config-schema").Type<string | string[]>;
        query: import("@kbn/config-schema").Type<any>;
        runtime_mappings: import("@kbn/config-schema").ObjectType<{}>;
        _source: import("@kbn/config-schema").Type<Readonly<{
            includes?: (string | undefined)[] | undefined;
            excludes?: (string | undefined)[] | undefined;
        } & {}> | undefined>;
    }>;
    allow_lazy_start: import("@kbn/config-schema").Type<boolean | undefined>;
    analysis: import("@kbn/config-schema").AnyType;
    analyzed_fields: import("@kbn/config-schema").AnyType;
    model_memory_limit: import("@kbn/config-schema").Type<string>;
    max_num_threads: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const dataFrameAnalyticsEvaluateSchema: import("@kbn/config-schema").ObjectType<{
    index: import("@kbn/config-schema").Type<string>;
    query: import("@kbn/config-schema").Type<any>;
    evaluation: import("@kbn/config-schema").Type<Readonly<{
        outlier_detection?: any;
        regression?: any;
        classification?: any;
    } & {}> | undefined>;
}>;
export declare const dataFrameAnalyticsExplainSchema: import("@kbn/config-schema").ObjectType<{
    description: import("@kbn/config-schema").Type<string | undefined>;
    dest: import("@kbn/config-schema").Type<any>;
    /** Source */
    source: import("@kbn/config-schema").ObjectType<{
        index: import("@kbn/config-schema").Type<string | string[]>;
        query: import("@kbn/config-schema").Type<any>;
        runtime_mappings: import("@kbn/config-schema").ObjectType<{}>;
    }>;
    analysis: import("@kbn/config-schema").AnyType;
    analyzed_fields: import("@kbn/config-schema").Type<any>;
    model_memory_limit: import("@kbn/config-schema").Type<string | undefined>;
    max_num_threads: import("@kbn/config-schema").Type<number | undefined>;
    _meta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
}>;
export declare const dataFrameAnalyticsIdSchema: import("@kbn/config-schema").ObjectType<{
    analyticsId: import("@kbn/config-schema").Type<string>;
}>;
export declare const dataFrameAnalyticsQuerySchema: import("@kbn/config-schema").ObjectType<{
    excludeGenerated: import("@kbn/config-schema").Type<boolean | undefined>;
    size: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const deleteDataFrameAnalyticsJobSchema: import("@kbn/config-schema").ObjectType<{
    deleteDestIndex: import("@kbn/config-schema").Type<boolean | undefined>;
    deleteDestDataView: import("@kbn/config-schema").Type<boolean | undefined>;
    force: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const dataFrameAnalyticsJobUpdateSchema: import("@kbn/config-schema").ObjectType<{
    description: import("@kbn/config-schema").Type<string | undefined>;
    model_memory_limit: import("@kbn/config-schema").Type<string | undefined>;
    allow_lazy_start: import("@kbn/config-schema").Type<boolean | undefined>;
    max_num_threads: import("@kbn/config-schema").Type<number | undefined>;
    _meta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
}>;
export declare const stopsDataFrameAnalyticsJobQuerySchema: import("@kbn/config-schema").ObjectType<{
    force: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const dataFrameAnalyticsJobsExistSchema: import("@kbn/config-schema").ObjectType<{
    analyticsIds: import("@kbn/config-schema").Type<string[]>;
    allSpaces: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const dataFrameAnalyticsMapQuerySchema: import("@kbn/config-schema").Type<Readonly<{
    type?: string | undefined;
    treatAsRoot?: any;
} & {}> | undefined>;
export declare const dataFrameAnalyticsNewJobCapsParamsSchema: import("@kbn/config-schema").ObjectType<{
    indexPattern: import("@kbn/config-schema").Type<string>;
}>;
export declare const dataFrameAnalyticsNewJobCapsQuerySchema: import("@kbn/config-schema").Type<Readonly<{
    rollup?: string | undefined;
} & {}> | undefined>;
interface DataFrameAnalyticsJobsCreated {
    id: string;
}
interface CreatedError {
    id: string;
    error: any;
}
export interface PutDataFrameAnalyticsResponseSchema extends CreateDataViewApiResponseSchema {
    dataFrameAnalyticsJobsCreated: DataFrameAnalyticsJobsCreated[];
    dataFrameAnalyticsJobsErrors: CreatedError[];
}
export {};
