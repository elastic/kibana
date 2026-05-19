import { z } from '@kbn/zod/v4';
export type AnonymizationEntityClass = z.infer<typeof AnonymizationEntityClass>;
export declare const AnonymizationEntityClass: z.ZodEnum<{
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
export type AnonymizationEntityClassEnum = typeof AnonymizationEntityClass.enum;
export declare const AnonymizationEntityClassEnum: {
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
};
export type NerEntityClass = z.infer<typeof NerEntityClass>;
export declare const NerEntityClass: z.ZodEnum<{
    PER: "PER";
    ORG: "ORG";
    LOC: "LOC";
    MISC: "MISC";
}>;
export type NerEntityClassEnum = typeof NerEntityClass.enum;
export declare const NerEntityClassEnum: {
    PER: "PER";
    ORG: "ORG";
    LOC: "LOC";
    MISC: "MISC";
};
export type ErrorResponse = z.infer<typeof ErrorResponse>;
export declare const ErrorResponse: z.ZodObject<{
    message: z.ZodString;
}, z.core.$strip>;
export type AnonymizationTargetType = z.infer<typeof AnonymizationTargetType>;
export declare const AnonymizationTargetType: z.ZodEnum<{
    index: "index";
    data_view: "data_view";
    index_pattern: "index_pattern";
}>;
export type AnonymizationTargetTypeEnum = typeof AnonymizationTargetType.enum;
export declare const AnonymizationTargetTypeEnum: {
    index: "index";
    data_view: "data_view";
    index_pattern: "index_pattern";
};
export type SortOrder = z.infer<typeof SortOrder>;
export declare const SortOrder: z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>;
export type SortOrderEnum = typeof SortOrder.enum;
export declare const SortOrderEnum: {
    asc: "asc";
    desc: "desc";
};
export type ProfileSortField = z.infer<typeof ProfileSortField>;
export declare const ProfileSortField: z.ZodEnum<{
    name: "name";
    updated_at: "updated_at";
    created_at: "created_at";
}>;
export type ProfileSortFieldEnum = typeof ProfileSortField.enum;
export declare const ProfileSortFieldEnum: {
    name: "name";
    updated_at: "updated_at";
    created_at: "created_at";
};
export type FieldRule = z.infer<typeof FieldRule>;
export declare const FieldRule: z.ZodObject<{
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
}, z.core.$strip>;
export type RegexRule = z.infer<typeof RegexRule>;
export declare const RegexRule: z.ZodObject<{
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
}, z.core.$strip>;
export type NerRule = z.infer<typeof NerRule>;
export declare const NerRule: z.ZodObject<{
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
}, z.core.$strip>;
export type AnonymizationProfileRules = z.infer<typeof AnonymizationProfileRules>;
export declare const AnonymizationProfileRules: z.ZodObject<{
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
export type CreateAnonymizationProfileRequest = z.infer<typeof CreateAnonymizationProfileRequest>;
export declare const CreateAnonymizationProfileRequest: z.ZodObject<{
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
export type UpdateAnonymizationProfileRequest = z.infer<typeof UpdateAnonymizationProfileRequest>;
export declare const UpdateAnonymizationProfileRequest: z.ZodObject<{
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
export type AnonymizationProfile = z.infer<typeof AnonymizationProfile>;
export declare const AnonymizationProfile: z.ZodObject<{
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
export type FindProfilesResponse = z.infer<typeof FindProfilesResponse>;
export declare const FindProfilesResponse: z.ZodObject<{
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
export type ReplacementsSetResponse = z.infer<typeof ReplacementsSetResponse>;
export declare const ReplacementsSetResponse: z.ZodObject<{
    id: z.ZodString;
    namespace: z.ZodString;
    replacements: z.ZodArray<z.ZodObject<{
        anonymized: z.ZodString;
        original: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type DeanonymizeRequest = z.infer<typeof DeanonymizeRequest>;
export declare const DeanonymizeRequest: z.ZodObject<{
    text: z.ZodString;
    replacementsId: z.ZodString;
}, z.core.$strip>;
export type DeanonymizeResponse = z.infer<typeof DeanonymizeResponse>;
export declare const DeanonymizeResponse: z.ZodObject<{
    text: z.ZodString;
}, z.core.$strip>;
