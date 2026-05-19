export declare const modelIdSchema: import("@kbn/config-schema").ObjectType<{
    modelId: import("@kbn/config-schema").Type<string>;
}>;
export declare const modelAndDeploymentIdSchema: import("@kbn/config-schema").ObjectType<{
    deploymentId: import("@kbn/config-schema").Type<string>;
    modelId: import("@kbn/config-schema").Type<string>;
}>;
export declare const createInferenceSchema: import("@kbn/config-schema").ObjectType<{
    taskType: import("@kbn/config-schema").Type<"text_embedding" | "sparse_embedding">;
    inferenceId: import("@kbn/config-schema").Type<string>;
}>;
export declare const threadingParamsQuerySchema: import("@kbn/config-schema").Type<Readonly<{
    priority?: "normal" | "low" | undefined;
    deployment_id?: string | undefined;
    number_of_allocations?: number | undefined;
    threads_per_allocation?: number | undefined;
} & {}> | undefined>;
export declare const threadingParamsBodySchema: import("@kbn/config-schema").Type<Readonly<{
    adaptive_allocations?: Readonly<{
        max_number_of_allocations?: number | undefined;
        min_number_of_allocations?: number | undefined;
    } & {
        enabled: boolean;
    }> | undefined;
} & {}> | null>;
export declare const updateDeploymentParamsSchema: import("@kbn/config-schema").ObjectType<{
    number_of_allocations: import("@kbn/config-schema").Type<number | undefined>;
    adaptive_allocations: import("@kbn/config-schema").Type<Readonly<{
        max_number_of_allocations?: number | undefined;
        min_number_of_allocations?: number | undefined;
    } & {
        enabled: boolean;
    }> | undefined>;
}>;
export declare const optionalModelIdSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * Model ID
     */
    modelId: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const getInferenceQuerySchema: import("@kbn/config-schema").ObjectType<{
    size: import("@kbn/config-schema").Type<string | undefined>;
    include: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const putTrainedModelQuerySchema: import("@kbn/config-schema").ObjectType<{
    defer_definition_decompression: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const inferTrainedModelQuery: import("@kbn/config-schema").ObjectType<{
    timeout: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const inferTrainedModelBody: import("@kbn/config-schema").ObjectType<{
    docs: import("@kbn/config-schema").AnyType;
    inference_config: import("@kbn/config-schema").Type<any>;
}>;
export declare const pipelineSimulateBody: import("@kbn/config-schema").ObjectType<{
    pipeline: import("@kbn/config-schema").AnyType;
    docs: import("@kbn/config-schema").Type<any[]>;
}>;
export declare const pipelineDocs: import("@kbn/config-schema").Type<string[]>;
export declare const stopDeploymentSchema: import("@kbn/config-schema").ObjectType<{
    force: import("@kbn/config-schema").Type<boolean | undefined>;
    modelId: import("@kbn/config-schema").Type<string>;
}>;
export declare const deleteTrainedModelQuerySchema: import("@kbn/config-schema").ObjectType<{
    with_pipelines: import("@kbn/config-schema").Type<boolean | undefined>;
    force: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const createIngestPipelineSchema: import("@kbn/config-schema").ObjectType<{
    pipelineName: import("@kbn/config-schema").Type<string>;
    pipeline: import("@kbn/config-schema").Type<Readonly<{
        description?: string | undefined;
    } & {
        processors: any[];
    }> | undefined>;
}>;
export declare const modelDownloadsQuery: import("@kbn/config-schema").ObjectType<{
    version: import("@kbn/config-schema").Type<"1" | "2" | undefined>;
}>;
export declare const curatedModelsParamsSchema: import("@kbn/config-schema").ObjectType<{
    modelName: import("@kbn/config-schema").Type<string>;
}>;
export declare const curatedModelsQuerySchema: import("@kbn/config-schema").ObjectType<{
    version: import("@kbn/config-schema").Type<number | undefined>;
}>;
