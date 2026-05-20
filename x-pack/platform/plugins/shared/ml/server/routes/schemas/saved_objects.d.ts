export declare const jobTypeLiterals: import("@kbn/config-schema").Type<"data-frame-analytics" | "anomaly-detector">;
export declare const itemTypeLiterals: import("@kbn/config-schema").Type<"data-frame-analytics" | "anomaly-detector" | "trained-model">;
export declare const itemTypeSchema: import("@kbn/config-schema").ObjectType<{
    jobType: import("@kbn/config-schema").Type<"data-frame-analytics" | "anomaly-detector" | "trained-model">;
}>;
export declare const jobTypeSchema: import("@kbn/config-schema").ObjectType<{
    jobType: import("@kbn/config-schema").Type<"data-frame-analytics" | "anomaly-detector">;
}>;
export declare const updateJobsSpaces: import("@kbn/config-schema").ObjectType<{
    jobType: import("@kbn/config-schema").Type<"data-frame-analytics" | "anomaly-detector">;
    jobIds: import("@kbn/config-schema").Type<string[]>;
    spacesToAdd: import("@kbn/config-schema").Type<string[]>;
    spacesToRemove: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const updateTrainedModelsSpaces: import("@kbn/config-schema").ObjectType<{
    modelIds: import("@kbn/config-schema").Type<string[]>;
    spacesToAdd: import("@kbn/config-schema").Type<string[]>;
    spacesToRemove: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const itemsAndCurrentSpace: import("@kbn/config-schema").ObjectType<{
    mlSavedObjectType: import("@kbn/config-schema").Type<"data-frame-analytics" | "anomaly-detector" | "trained-model">;
    ids: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const syncJobObjects: import("@kbn/config-schema").ObjectType<{
    simulate: import("@kbn/config-schema").Type<boolean | undefined>;
    addToAllSpaces: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const syncCheckSchema: import("@kbn/config-schema").ObjectType<{
    mlSavedObjectType: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const canDeleteMLSpaceAwareItemsSchema: import("@kbn/config-schema").ObjectType<{
    ids: import("@kbn/config-schema").Type<string[]>;
}>;
