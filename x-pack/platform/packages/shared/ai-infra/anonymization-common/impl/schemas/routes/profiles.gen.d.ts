import { z } from '@kbn/zod/v4';
export type CreateAnonymizationProfileRequestBody = z.infer<typeof CreateAnonymizationProfileRequestBody>;
export declare const CreateAnonymizationProfileRequestBody: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    targetType: z.ZodEnum<{
        index: "index";
        data_view: "data_view";
        index_pattern: "index_pattern";
    }>;
    targetId: z.ZodString;
    rules: z.ZodObject<{
        fieldRules: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            allowed: z.ZodBoolean;
            anonymized: z.ZodBoolean;
            entityClass: z.ZodOptional<z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
                HOST_NAME: "HOST_NAME";
                USER_NAME: "USER_NAME";
                IP: "IP";
                URL: "URL";
                EMAIL: "EMAIL";
                CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                ENTITY_NAME: "ENTITY_NAME";
                RESOURCE_NAME: "RESOURCE_NAME";
                RESOURCE_ID: "RESOURCE_ID";
            }>>;
        }, z.core.$strip>>;
        regexRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"regex">;
            entityClass: z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
                HOST_NAME: "HOST_NAME";
                USER_NAME: "USER_NAME";
                IP: "IP";
                URL: "URL";
                EMAIL: "EMAIL";
                CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                ENTITY_NAME: "ENTITY_NAME";
                RESOURCE_NAME: "RESOURCE_NAME";
                RESOURCE_ID: "RESOURCE_ID";
            }>;
            pattern: z.ZodString;
            enabled: z.ZodBoolean;
        }, z.core.$strip>>>>;
        nerRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"ner">;
            modelId: z.ZodOptional<z.ZodString>;
            allowedEntityClasses: z.ZodArray<z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
            }>>;
            enabled: z.ZodBoolean;
        }, z.core.$strip>>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateAnonymizationProfileRequestBodyInput = z.input<typeof CreateAnonymizationProfileRequestBody>;
export type CreateAnonymizationProfileResponse = z.infer<typeof CreateAnonymizationProfileResponse>;
export declare const CreateAnonymizationProfileResponse: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    targetType: z.ZodEnum<{
        index: "index";
        data_view: "data_view";
        index_pattern: "index_pattern";
    }>;
    targetId: z.ZodString;
    rules: z.ZodObject<{
        fieldRules: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            allowed: z.ZodBoolean;
            anonymized: z.ZodBoolean;
            entityClass: z.ZodOptional<z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
                HOST_NAME: "HOST_NAME";
                USER_NAME: "USER_NAME";
                IP: "IP";
                URL: "URL";
                EMAIL: "EMAIL";
                CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                ENTITY_NAME: "ENTITY_NAME";
                RESOURCE_NAME: "RESOURCE_NAME";
                RESOURCE_ID: "RESOURCE_ID";
            }>>;
        }, z.core.$strip>>;
        regexRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"regex">;
            entityClass: z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
                HOST_NAME: "HOST_NAME";
                USER_NAME: "USER_NAME";
                IP: "IP";
                URL: "URL";
                EMAIL: "EMAIL";
                CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                ENTITY_NAME: "ENTITY_NAME";
                RESOURCE_NAME: "RESOURCE_NAME";
                RESOURCE_ID: "RESOURCE_ID";
            }>;
            pattern: z.ZodString;
            enabled: z.ZodBoolean;
        }, z.core.$strip>>>>;
        nerRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"ner">;
            modelId: z.ZodOptional<z.ZodString>;
            allowedEntityClasses: z.ZodArray<z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
            }>>;
            enabled: z.ZodBoolean;
        }, z.core.$strip>>>>;
    }, z.core.$strip>;
    saltId: z.ZodString;
    namespace: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    createdBy: z.ZodString;
    updatedBy: z.ZodString;
}, z.core.$strip>;
export type DeleteAnonymizationProfileRequestParams = z.infer<typeof DeleteAnonymizationProfileRequestParams>;
export declare const DeleteAnonymizationProfileRequestParams: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export type DeleteAnonymizationProfileRequestParamsInput = z.input<typeof DeleteAnonymizationProfileRequestParams>;
export type DeleteAnonymizationProfileResponse = z.infer<typeof DeleteAnonymizationProfileResponse>;
export declare const DeleteAnonymizationProfileResponse: z.ZodObject<{
    deleted: z.ZodBoolean;
}, z.core.$strip>;
export type FindAnonymizationProfilesRequestQuery = z.infer<typeof FindAnonymizationProfilesRequestQuery>;
export declare const FindAnonymizationProfilesRequestQuery: z.ZodObject<{
    filter: z.ZodOptional<z.ZodString>;
    target_type: z.ZodOptional<z.ZodEnum<{
        index: "index";
        data_view: "data_view";
        index_pattern: "index_pattern";
    }>>;
    target_id: z.ZodOptional<z.ZodString>;
    sort_field: z.ZodOptional<z.ZodEnum<{
        name: "name";
        updated_at: "updated_at";
        created_at: "created_at";
    }>>;
    sort_order: z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    per_page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type FindAnonymizationProfilesRequestQueryInput = z.input<typeof FindAnonymizationProfilesRequestQuery>;
export type FindAnonymizationProfilesResponse = z.infer<typeof FindAnonymizationProfilesResponse>;
export declare const FindAnonymizationProfilesResponse: z.ZodObject<{
    page: z.ZodNumber;
    perPage: z.ZodNumber;
    total: z.ZodNumber;
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        targetType: z.ZodEnum<{
            index: "index";
            data_view: "data_view";
            index_pattern: "index_pattern";
        }>;
        targetId: z.ZodString;
        rules: z.ZodObject<{
            fieldRules: z.ZodArray<z.ZodObject<{
                field: z.ZodString;
                allowed: z.ZodBoolean;
                anonymized: z.ZodBoolean;
                entityClass: z.ZodOptional<z.ZodEnum<{
                    PER: "PER";
                    ORG: "ORG";
                    LOC: "LOC";
                    MISC: "MISC";
                    HOST_NAME: "HOST_NAME";
                    USER_NAME: "USER_NAME";
                    IP: "IP";
                    URL: "URL";
                    EMAIL: "EMAIL";
                    CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                    ENTITY_NAME: "ENTITY_NAME";
                    RESOURCE_NAME: "RESOURCE_NAME";
                    RESOURCE_ID: "RESOURCE_ID";
                }>>;
            }, z.core.$strip>>;
            regexRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"regex">;
                entityClass: z.ZodEnum<{
                    PER: "PER";
                    ORG: "ORG";
                    LOC: "LOC";
                    MISC: "MISC";
                    HOST_NAME: "HOST_NAME";
                    USER_NAME: "USER_NAME";
                    IP: "IP";
                    URL: "URL";
                    EMAIL: "EMAIL";
                    CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                    ENTITY_NAME: "ENTITY_NAME";
                    RESOURCE_NAME: "RESOURCE_NAME";
                    RESOURCE_ID: "RESOURCE_ID";
                }>;
                pattern: z.ZodString;
                enabled: z.ZodBoolean;
            }, z.core.$strip>>>>;
            nerRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"ner">;
                modelId: z.ZodOptional<z.ZodString>;
                allowedEntityClasses: z.ZodArray<z.ZodEnum<{
                    PER: "PER";
                    ORG: "ORG";
                    LOC: "LOC";
                    MISC: "MISC";
                }>>;
                enabled: z.ZodBoolean;
            }, z.core.$strip>>>>;
        }, z.core.$strip>;
        saltId: z.ZodString;
        namespace: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        createdBy: z.ZodString;
        updatedBy: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type GetAnonymizationProfileRequestParams = z.infer<typeof GetAnonymizationProfileRequestParams>;
export declare const GetAnonymizationProfileRequestParams: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export type GetAnonymizationProfileRequestParamsInput = z.input<typeof GetAnonymizationProfileRequestParams>;
export type GetAnonymizationProfileResponse = z.infer<typeof GetAnonymizationProfileResponse>;
export declare const GetAnonymizationProfileResponse: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    targetType: z.ZodEnum<{
        index: "index";
        data_view: "data_view";
        index_pattern: "index_pattern";
    }>;
    targetId: z.ZodString;
    rules: z.ZodObject<{
        fieldRules: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            allowed: z.ZodBoolean;
            anonymized: z.ZodBoolean;
            entityClass: z.ZodOptional<z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
                HOST_NAME: "HOST_NAME";
                USER_NAME: "USER_NAME";
                IP: "IP";
                URL: "URL";
                EMAIL: "EMAIL";
                CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                ENTITY_NAME: "ENTITY_NAME";
                RESOURCE_NAME: "RESOURCE_NAME";
                RESOURCE_ID: "RESOURCE_ID";
            }>>;
        }, z.core.$strip>>;
        regexRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"regex">;
            entityClass: z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
                HOST_NAME: "HOST_NAME";
                USER_NAME: "USER_NAME";
                IP: "IP";
                URL: "URL";
                EMAIL: "EMAIL";
                CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                ENTITY_NAME: "ENTITY_NAME";
                RESOURCE_NAME: "RESOURCE_NAME";
                RESOURCE_ID: "RESOURCE_ID";
            }>;
            pattern: z.ZodString;
            enabled: z.ZodBoolean;
        }, z.core.$strip>>>>;
        nerRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"ner">;
            modelId: z.ZodOptional<z.ZodString>;
            allowedEntityClasses: z.ZodArray<z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
            }>>;
            enabled: z.ZodBoolean;
        }, z.core.$strip>>>>;
    }, z.core.$strip>;
    saltId: z.ZodString;
    namespace: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    createdBy: z.ZodString;
    updatedBy: z.ZodString;
}, z.core.$strip>;
export type UpdateAnonymizationProfileRequestParams = z.infer<typeof UpdateAnonymizationProfileRequestParams>;
export declare const UpdateAnonymizationProfileRequestParams: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export type UpdateAnonymizationProfileRequestParamsInput = z.input<typeof UpdateAnonymizationProfileRequestParams>;
export type UpdateAnonymizationProfileRequestBody = z.infer<typeof UpdateAnonymizationProfileRequestBody>;
export declare const UpdateAnonymizationProfileRequestBody: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    rules: z.ZodOptional<z.ZodObject<{
        fieldRules: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            allowed: z.ZodBoolean;
            anonymized: z.ZodBoolean;
            entityClass: z.ZodOptional<z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
                HOST_NAME: "HOST_NAME";
                USER_NAME: "USER_NAME";
                IP: "IP";
                URL: "URL";
                EMAIL: "EMAIL";
                CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                ENTITY_NAME: "ENTITY_NAME";
                RESOURCE_NAME: "RESOURCE_NAME";
                RESOURCE_ID: "RESOURCE_ID";
            }>>;
        }, z.core.$strip>>;
        regexRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"regex">;
            entityClass: z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
                HOST_NAME: "HOST_NAME";
                USER_NAME: "USER_NAME";
                IP: "IP";
                URL: "URL";
                EMAIL: "EMAIL";
                CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                ENTITY_NAME: "ENTITY_NAME";
                RESOURCE_NAME: "RESOURCE_NAME";
                RESOURCE_ID: "RESOURCE_ID";
            }>;
            pattern: z.ZodString;
            enabled: z.ZodBoolean;
        }, z.core.$strip>>>>;
        nerRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"ner">;
            modelId: z.ZodOptional<z.ZodString>;
            allowedEntityClasses: z.ZodArray<z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
            }>>;
            enabled: z.ZodBoolean;
        }, z.core.$strip>>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type UpdateAnonymizationProfileRequestBodyInput = z.input<typeof UpdateAnonymizationProfileRequestBody>;
export type UpdateAnonymizationProfileResponse = z.infer<typeof UpdateAnonymizationProfileResponse>;
export declare const UpdateAnonymizationProfileResponse: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    targetType: z.ZodEnum<{
        index: "index";
        data_view: "data_view";
        index_pattern: "index_pattern";
    }>;
    targetId: z.ZodString;
    rules: z.ZodObject<{
        fieldRules: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            allowed: z.ZodBoolean;
            anonymized: z.ZodBoolean;
            entityClass: z.ZodOptional<z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
                HOST_NAME: "HOST_NAME";
                USER_NAME: "USER_NAME";
                IP: "IP";
                URL: "URL";
                EMAIL: "EMAIL";
                CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                ENTITY_NAME: "ENTITY_NAME";
                RESOURCE_NAME: "RESOURCE_NAME";
                RESOURCE_ID: "RESOURCE_ID";
            }>>;
        }, z.core.$strip>>;
        regexRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"regex">;
            entityClass: z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
                HOST_NAME: "HOST_NAME";
                USER_NAME: "USER_NAME";
                IP: "IP";
                URL: "URL";
                EMAIL: "EMAIL";
                CLOUD_ACCOUNT: "CLOUD_ACCOUNT";
                ENTITY_NAME: "ENTITY_NAME";
                RESOURCE_NAME: "RESOURCE_NAME";
                RESOURCE_ID: "RESOURCE_ID";
            }>;
            pattern: z.ZodString;
            enabled: z.ZodBoolean;
        }, z.core.$strip>>>>;
        nerRules: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"ner">;
            modelId: z.ZodOptional<z.ZodString>;
            allowedEntityClasses: z.ZodArray<z.ZodEnum<{
                PER: "PER";
                ORG: "ORG";
                LOC: "LOC";
                MISC: "MISC";
            }>>;
            enabled: z.ZodBoolean;
        }, z.core.$strip>>>>;
    }, z.core.$strip>;
    saltId: z.ZodString;
    namespace: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    createdBy: z.ZodString;
    updatedBy: z.ZodString;
}, z.core.$strip>;
