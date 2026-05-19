import { z } from '@kbn/zod/v4';
/** default NER model **/
export declare const NER_MODEL_ID = "elastic__distilbert-base-uncased-finetuned-conll03-english";
/**
 * Entity classes produced by NER models (CoNLL-03 standard classes).
 * These are the only classes a NER model may emit; used to filter model output.
 */
export declare const NER_ENTITY_CLASSES: readonly ["PER", "ORG", "LOC", "MISC"];
export type NerEntityClass = (typeof NER_ENTITY_CLASSES)[number];
/**
 * Full canonical set of anonymization entity class labels.
 * Includes NER classes plus domain-specific field labels.
 * This list intentionally stays compact/canonical and does not include a
 * dedicated `PHONE` class; phone-like regex matches should use the closest
 * canonical class (`MISC`) until/unless a formal class is added.
 * Use these as token prefixes in masks (e.g. `HOST_NAME_abc123`).
 */
export declare const ANONYMIZATION_ENTITY_CLASSES: readonly ["PER", "ORG", "LOC", "MISC", "HOST_NAME", "USER_NAME", "IP", "URL", "EMAIL", "CLOUD_ACCOUNT", "ENTITY_NAME", "RESOURCE_NAME", "RESOURCE_ID"];
export type AnonymizationEntityClass = (typeof ANONYMIZATION_ENTITY_CLASSES)[number];
export declare const anonymizationEntityClassSchema: z.ZodEnum<{
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
export declare const nerEntityClassSchema: z.ZodEnum<{
    PER: "PER";
    ORG: "ORG";
    LOC: "LOC";
    MISC: "MISC";
}>;
export declare const TOKEN_SOURCE_TYPES: readonly ["message", "tool_call", "artifact", "workflow"];
export type TokenSourceType = (typeof TOKEN_SOURCE_TYPES)[number];
export declare const tokenSourceTypeSchema: z.ZodEnum<{
    message: "message";
    workflow: "workflow";
    tool_call: "tool_call";
    artifact: "artifact";
}>;
export declare const tokenSourceRefSchema: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
export declare const fieldRuleSchema: z.ZodObject<{
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
export declare const regexRuleSchema: z.ZodObject<{
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
export declare const nerRuleSchema: z.ZodObject<{
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
/** Reusable profile rules payload shared by APIs and persisted profiles. */
export declare const anonymizationProfileRulesSchema: z.ZodObject<{
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
export declare const anonymizationProfileSchema: z.ZodObject<{
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
/** Public API payload for profile creation. */
export declare const createAnonymizationProfileRequestSchema: z.ZodObject<{
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
/** Public API payload for profile updates. */
export declare const updateAnonymizationProfileRequestSchema: z.ZodObject<{
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
/** Public API query payload for profile search. */
export declare const findAnonymizationProfilesQuerySchema: z.ZodObject<{
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
export declare const tokenSourceEntrySchema: z.ZodObject<{
    token: z.ZodString;
    pointer: z.ZodString;
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
    sourceType: z.ZodEnum<{
        message: "message";
        workflow: "workflow";
        tool_call: "tool_call";
        artifact: "artifact";
    }>;
    sourceId: z.ZodString;
    sourceRef: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
    spanStart: z.ZodOptional<z.ZodNumber>;
    spanEnd: z.ZodOptional<z.ZodNumber>;
    field: z.ZodOptional<z.ZodString>;
    fieldRef: z.ZodOptional<z.ZodString>;
    ruleType: z.ZodOptional<z.ZodString>;
    ruleId: z.ZodOptional<z.ZodString>;
    firstSeenAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const replacementsSetSchema: z.ZodObject<{
    id: z.ZodString;
    namespace: z.ZodString;
    replacements: z.ZodArray<z.ZodObject<{
        anonymized: z.ZodString;
        original: z.ZodString;
    }, z.core.$strip>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    createdBy: z.ZodString;
}, z.core.$strip>;
