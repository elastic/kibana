export declare const setupModuleBodySchema: import("@kbn/config-schema").ObjectType<{
    prefix: import("@kbn/config-schema").Type<string | undefined>;
    groups: import("@kbn/config-schema").Type<string[] | undefined>;
    indexPatternName: import("@kbn/config-schema").Type<string | undefined>;
    query: import("@kbn/config-schema").Type<any>;
    useDedicatedIndex: import("@kbn/config-schema").Type<boolean | undefined>;
    startDatafeed: import("@kbn/config-schema").Type<boolean | undefined>;
    start: import("@kbn/config-schema").Type<number | undefined>;
    end: import("@kbn/config-schema").Type<number | undefined>;
    jobOverrides: import("@kbn/config-schema").Type<any>;
    datafeedOverrides: import("@kbn/config-schema").Type<any>;
    estimateModelMemory: import("@kbn/config-schema").Type<boolean | undefined>;
    applyToAllSpaces: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const optionalModuleIdParamSchema: import("@kbn/config-schema").ObjectType<{
    moduleId: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const moduleIdParamSchema: import("@kbn/config-schema").ObjectType<{
    moduleId: import("@kbn/config-schema").Type<string>;
}>;
export declare const optionalSizeQuerySchema: import("@kbn/config-schema").ObjectType<{
    size: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const recognizeModulesSchema: import("@kbn/config-schema").ObjectType<{
    indexPatternTitle: import("@kbn/config-schema").Type<string>;
}>;
export declare const moduleFilterSchema: import("@kbn/config-schema").ObjectType<{
    filter: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const recognizeModulesSchemaResponse: () => import("@kbn/config-schema").Type<Readonly<{
    query?: any;
    logo?: any;
} & {
    id: string;
    title: string;
    description: string;
}>[]>;
export declare const getModulesSchemaResponse: () => import("@kbn/config-schema").Type<Readonly<{
    query?: any;
    kibana?: any;
    tags?: string[] | undefined;
    logo?: any;
    logoFile?: string | undefined;
    defaultIndexPattern?: string | undefined;
} & {
    type: string;
    id: string;
    title: string;
    description: string;
    jobs: any[];
    datafeeds: any[];
}> | Readonly<{
    query?: any;
    kibana?: any;
    tags?: string[] | undefined;
    logo?: any;
    logoFile?: string | undefined;
    defaultIndexPattern?: string | undefined;
} & {
    type: string;
    id: string;
    title: string;
    description: string;
    jobs: any[];
    datafeeds: any[];
}>[]>;
/**
 *
 * @link DataRecognizerConfigResponse
 */
export declare const dataRecognizerConfigResponse: () => import("@kbn/config-schema").ObjectType<{
    datafeeds: import("@kbn/config-schema").Type<any[]>;
    jobs: import("@kbn/config-schema").Type<any[]>;
    kibana: import("@kbn/config-schema").Type<any>;
}>;
export declare const jobExistsResponse: () => import("@kbn/config-schema").ObjectType<{
    jobsExist: import("@kbn/config-schema").Type<boolean>;
    jobs: import("@kbn/config-schema").Type<Readonly<{
        latestResultsTimestampMs?: number | undefined;
    } & {
        id: string;
        latestTimestampMs: number;
        earliestTimestampMs: number;
    }>[] | undefined>;
}>;
