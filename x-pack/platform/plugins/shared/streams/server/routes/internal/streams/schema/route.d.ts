import type { FieldDefinitionType, NamedFieldDefinitionConfig } from '@kbn/streams-schema';
import type { z } from '@kbn/zod/v4';
import type { DocumentWithIgnoredFields } from '@kbn/streams-schema/src/shared/record_types';
export declare const __test__: {
    getSimulatableFieldDefinitions: (fields: NamedFieldDefinitionConfig[]) => ((import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
        type: FieldDefinitionType;
        format?: string;
        description?: string;
    } & {
        name: string;
    } & {
        type: FieldDefinitionType;
    }))[];
};
export declare const unmappedFieldsRoute: Record<"GET /internal/streams/{name}/schema/unmapped_fields", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/schema/unmapped_fields", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    unmappedFields: string[];
}, undefined>>;
export declare const schemaFieldsSimulationRoute: Record<"POST /internal/streams/{name}/schema/fields_simulation", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/schema/fields_simulation", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        field_definitions: z.ZodArray<z.ZodType<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | ({
            description: string;
            type?: never;
            format?: never;
        } & {
            name: string;
        }) | ({
            type: "system";
            description?: string;
        } & {
            name: string;
        }), unknown, z.core.$ZodTypeInternals<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | ({
            description: string;
            type?: never;
            format?: never;
        } & {
            name: string;
        }) | ({
            type: "system";
            description?: string;
        } & {
            name: string;
        }), unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    status: "unknown" | "success" | "failure";
    simulationError: string | null;
    documentsWithRuntimeFieldsApplied: DocumentWithIgnoredFields[] | null;
}, undefined>>;
export interface FieldConflict {
    fieldName: string;
    proposedType: string;
    conflictingStreams: Array<{
        streamName: string;
        existingType: string;
    }>;
}
export interface FieldsConflictsResponse {
    conflicts: FieldConflict[];
}
export declare const schemaFieldsConflictsRoute: Record<"POST /internal/streams/{name}/schema/fields_conflicts", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/schema/fields_conflicts", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        field_definitions: z.ZodArray<z.ZodType<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | ({
            description: string;
            type?: never;
            format?: never;
        } & {
            name: string;
        }) | ({
            type: "system";
            description?: string;
        } & {
            name: string;
        }), unknown, z.core.$ZodTypeInternals<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
            type: FieldDefinitionType;
            format?: string;
            description?: string;
        } & {
            name: string;
        }) | ({
            description: string;
            type?: never;
            format?: never;
        } & {
            name: string;
        }) | ({
            type: "system";
            description?: string;
        } & {
            name: string;
        }), unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, FieldsConflictsResponse, undefined>>;
export declare const internalSchemaRoutes: {
    "POST /internal/streams/{name}/schema/fields_conflicts": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/schema/fields_conflicts", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            field_definitions: z.ZodArray<z.ZodType<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | ({
                description: string;
                type?: never;
                format?: never;
            } & {
                name: string;
            }) | ({
                type: "system";
                description?: string;
            } & {
                name: string;
            }), unknown, z.core.$ZodTypeInternals<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | ({
                description: string;
                type?: never;
                format?: never;
            } & {
                name: string;
            }) | ({
                type: "system";
                description?: string;
            } & {
                name: string;
            }), unknown>>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, FieldsConflictsResponse, undefined>;
    "POST /internal/streams/{name}/schema/fields_simulation": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/schema/fields_simulation", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            field_definitions: z.ZodArray<z.ZodType<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | ({
                description: string;
                type?: never;
                format?: never;
            } & {
                name: string;
            }) | ({
                type: "system";
                description?: string;
            } & {
                name: string;
            }), unknown, z.core.$ZodTypeInternals<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
                type: FieldDefinitionType;
                format?: string;
                description?: string;
            } & {
                name: string;
            }) | ({
                description: string;
                type?: never;
                format?: never;
            } & {
                name: string;
            }) | ({
                type: "system";
                description?: string;
            } & {
                name: string;
            }), unknown>>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        status: "unknown" | "success" | "failure";
        simulationError: string | null;
        documentsWithRuntimeFieldsApplied: DocumentWithIgnoredFields[] | null;
    }, undefined>;
    "GET /internal/streams/{name}/schema/unmapped_fields": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/schema/unmapped_fields", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        unmappedFields: string[];
    }, undefined>;
};
