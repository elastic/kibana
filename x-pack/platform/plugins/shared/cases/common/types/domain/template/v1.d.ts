import { z } from '@kbn/zod/v4';
/**
 * Template schema for case templates
 */
export declare const TemplateSchema: z.ZodObject<{
    templateId: z.ZodString;
    name: z.ZodString;
    owner: z.ZodString;
    definition: z.ZodString;
    templateVersion: z.ZodNumber;
    deletedAt: z.ZodNullable<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    author: z.ZodOptional<z.ZodString>;
    usageCount: z.ZodOptional<z.ZodNumber>;
    fieldCount: z.ZodOptional<z.ZodNumber>;
    fieldNames: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        label: z.ZodString;
        type: z.ZodString;
        control: z.ZodString;
    }, z.core.$strip>>>;
    lastUsedAt: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    isLatest: z.ZodOptional<z.ZodBoolean>;
    isEnabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type Template = z.infer<typeof TemplateSchema>;
/**
 * Parsed template definition
 */
export declare const ParsedTemplateDefinitionSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    severity: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        medium: "medium";
        high: "high";
        low: "low";
    }>>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    extends: z.ZodOptional<z.ZodString>;
    fields: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        name: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"keyword">;
        display: z.ZodOptional<z.ZodObject<{
            show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
        validation: z.ZodOptional<z.ZodObject<{
            required: z.ZodOptional<z.ZodBoolean>;
            required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
            pattern: z.ZodOptional<z.ZodObject<{
                regex: z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            min_length: z.ZodOptional<z.ZodNumber>;
            max_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        metadata: z.ZodOptional<z.ZodObject<{
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString>]>>;
        }, z.core.$catchall<z.ZodUnknown>>>;
        control: z.ZodLiteral<"INPUT_TEXT">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        display: z.ZodOptional<z.ZodObject<{
            show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
        validation: z.ZodOptional<z.ZodObject<{
            required: z.ZodOptional<z.ZodBoolean>;
            required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
            pattern: z.ZodOptional<z.ZodObject<{
                regex: z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            min_length: z.ZodOptional<z.ZodNumber>;
            max_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        control: z.ZodLiteral<"INPUT_NUMBER">;
        type: z.ZodUnion<readonly [z.ZodLiteral<"long">, z.ZodLiteral<"integer">, z.ZodLiteral<"short">, z.ZodLiteral<"byte">, z.ZodLiteral<"double">, z.ZodLiteral<"float">, z.ZodLiteral<"half_float">, z.ZodLiteral<"scaled_float">, z.ZodLiteral<"unsigned_long">]>;
        metadata: z.ZodOptional<z.ZodObject<{
            default: z.ZodOptional<z.ZodNumber>;
        }, z.core.$catchall<z.ZodUnknown>>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"keyword">;
        display: z.ZodOptional<z.ZodObject<{
            show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
        validation: z.ZodOptional<z.ZodObject<{
            required: z.ZodOptional<z.ZodBoolean>;
            required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
            pattern: z.ZodOptional<z.ZodObject<{
                regex: z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            min_length: z.ZodOptional<z.ZodNumber>;
            max_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        control: z.ZodLiteral<"SELECT_BASIC">;
        metadata: z.ZodObject<{
            options: z.ZodArray<z.ZodString>;
        }, z.core.$catchall<z.ZodUnknown>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"keyword">;
        display: z.ZodOptional<z.ZodObject<{
            show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
        validation: z.ZodOptional<z.ZodObject<{
            required: z.ZodOptional<z.ZodBoolean>;
            required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
            pattern: z.ZodOptional<z.ZodObject<{
                regex: z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            min_length: z.ZodOptional<z.ZodNumber>;
            max_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        metadata: z.ZodOptional<z.ZodObject<{
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString>]>>;
        }, z.core.$catchall<z.ZodUnknown>>>;
        control: z.ZodLiteral<"TEXTAREA">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        display: z.ZodOptional<z.ZodObject<{
            show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
        validation: z.ZodOptional<z.ZodObject<{
            required: z.ZodOptional<z.ZodBoolean>;
            required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
            pattern: z.ZodOptional<z.ZodObject<{
                regex: z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            min_length: z.ZodOptional<z.ZodNumber>;
            max_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        control: z.ZodLiteral<"DATE_PICKER">;
        type: z.ZodLiteral<"date">;
        metadata: z.ZodOptional<z.ZodObject<{
            show_time: z.ZodOptional<z.ZodBoolean>;
            timezone: z.ZodOptional<z.ZodEnum<{
                local: "local";
                utc: "utc";
            }>>;
        }, z.core.$catchall<z.ZodUnknown>>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"keyword">;
        display: z.ZodOptional<z.ZodObject<{
            show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
        validation: z.ZodOptional<z.ZodObject<{
            required: z.ZodOptional<z.ZodBoolean>;
            required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
            pattern: z.ZodOptional<z.ZodObject<{
                regex: z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            min_length: z.ZodOptional<z.ZodNumber>;
            max_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        control: z.ZodLiteral<"USER_PICKER">;
        metadata: z.ZodOptional<z.ZodObject<{
            multiple: z.ZodOptional<z.ZodBoolean>;
            default: z.ZodOptional<z.ZodArray<z.ZodObject<{
                uid: z.ZodString;
                name: z.ZodString;
            }, z.core.$strip>>>;
        }, z.core.$catchall<z.ZodUnknown>>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"keyword">;
        display: z.ZodOptional<z.ZodObject<{
            show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
        validation: z.ZodOptional<z.ZodObject<{
            required: z.ZodOptional<z.ZodBoolean>;
            required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
            pattern: z.ZodOptional<z.ZodObject<{
                regex: z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            min_length: z.ZodOptional<z.ZodNumber>;
            max_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        control: z.ZodLiteral<"CHECKBOX_GROUP">;
        metadata: z.ZodObject<{
            options: z.ZodArray<z.ZodString>;
            default: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$catchall<z.ZodUnknown>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"keyword">;
        display: z.ZodOptional<z.ZodObject<{
            show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
        validation: z.ZodOptional<z.ZodObject<{
            required: z.ZodOptional<z.ZodBoolean>;
            required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                field: z.ZodString;
                operator: z.ZodEnum<{
                    empty: "empty";
                    contains: "contains";
                    eq: "eq";
                    neq: "neq";
                    not_empty: "not_empty";
                }>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            }, z.core.$strip>, z.ZodObject<{
                combine: z.ZodDefault<z.ZodEnum<{
                    all: "all";
                    any: "any";
                }>>;
                rules: z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>>;
            }, z.core.$strip>]>>;
            pattern: z.ZodOptional<z.ZodObject<{
                regex: z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            min_length: z.ZodOptional<z.ZodNumber>;
            max_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        control: z.ZodLiteral<"RADIO_GROUP">;
        metadata: z.ZodObject<{
            options: z.ZodArray<z.ZodString>;
            default: z.ZodOptional<z.ZodString>;
        }, z.core.$catchall<z.ZodUnknown>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        $ref: z.ZodString;
        metadata: z.ZodOptional<z.ZodObject<{
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                uid: z.ZodString;
                name: z.ZodString;
            }, z.core.$strip>>]>>;
        }, z.core.$strip>>;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
/**
 * Parsed template schema with parsed definition
 */
export declare const ParsedTemplateSchema: z.ZodObject<{
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    fieldNames: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        label: z.ZodString;
        type: z.ZodString;
        control: z.ZodString;
    }, z.core.$strip>>>;
    owner: z.ZodString;
    isEnabled: z.ZodOptional<z.ZodBoolean>;
    author: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    fieldCount: z.ZodOptional<z.ZodNumber>;
    templateId: z.ZodString;
    templateVersion: z.ZodNumber;
    deletedAt: z.ZodNullable<z.ZodString>;
    usageCount: z.ZodOptional<z.ZodNumber>;
    lastUsedAt: z.ZodOptional<z.ZodString>;
    definition: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        severity: z.ZodOptional<z.ZodEnum<{
            critical: "critical";
            medium: "medium";
            high: "high";
            low: "low";
        }>>;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        extends: z.ZodOptional<z.ZodString>;
        fields: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"keyword">;
            display: z.ZodOptional<z.ZodObject<{
                show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
            }, z.core.$strip>>;
            validation: z.ZodOptional<z.ZodObject<{
                required: z.ZodOptional<z.ZodBoolean>;
                required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
                pattern: z.ZodOptional<z.ZodObject<{
                    regex: z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
                min_length: z.ZodOptional<z.ZodNumber>;
                max_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            metadata: z.ZodOptional<z.ZodObject<{
                default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString>]>>;
            }, z.core.$catchall<z.ZodUnknown>>>;
            control: z.ZodLiteral<"INPUT_TEXT">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            display: z.ZodOptional<z.ZodObject<{
                show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
            }, z.core.$strip>>;
            validation: z.ZodOptional<z.ZodObject<{
                required: z.ZodOptional<z.ZodBoolean>;
                required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
                pattern: z.ZodOptional<z.ZodObject<{
                    regex: z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
                min_length: z.ZodOptional<z.ZodNumber>;
                max_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            control: z.ZodLiteral<"INPUT_NUMBER">;
            type: z.ZodUnion<readonly [z.ZodLiteral<"long">, z.ZodLiteral<"integer">, z.ZodLiteral<"short">, z.ZodLiteral<"byte">, z.ZodLiteral<"double">, z.ZodLiteral<"float">, z.ZodLiteral<"half_float">, z.ZodLiteral<"scaled_float">, z.ZodLiteral<"unsigned_long">]>;
            metadata: z.ZodOptional<z.ZodObject<{
                default: z.ZodOptional<z.ZodNumber>;
            }, z.core.$catchall<z.ZodUnknown>>>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"keyword">;
            display: z.ZodOptional<z.ZodObject<{
                show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
            }, z.core.$strip>>;
            validation: z.ZodOptional<z.ZodObject<{
                required: z.ZodOptional<z.ZodBoolean>;
                required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
                pattern: z.ZodOptional<z.ZodObject<{
                    regex: z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
                min_length: z.ZodOptional<z.ZodNumber>;
                max_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            control: z.ZodLiteral<"SELECT_BASIC">;
            metadata: z.ZodObject<{
                options: z.ZodArray<z.ZodString>;
            }, z.core.$catchall<z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"keyword">;
            display: z.ZodOptional<z.ZodObject<{
                show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
            }, z.core.$strip>>;
            validation: z.ZodOptional<z.ZodObject<{
                required: z.ZodOptional<z.ZodBoolean>;
                required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
                pattern: z.ZodOptional<z.ZodObject<{
                    regex: z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
                min_length: z.ZodOptional<z.ZodNumber>;
                max_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            metadata: z.ZodOptional<z.ZodObject<{
                default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString>]>>;
            }, z.core.$catchall<z.ZodUnknown>>>;
            control: z.ZodLiteral<"TEXTAREA">;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            display: z.ZodOptional<z.ZodObject<{
                show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
            }, z.core.$strip>>;
            validation: z.ZodOptional<z.ZodObject<{
                required: z.ZodOptional<z.ZodBoolean>;
                required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
                pattern: z.ZodOptional<z.ZodObject<{
                    regex: z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
                min_length: z.ZodOptional<z.ZodNumber>;
                max_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            control: z.ZodLiteral<"DATE_PICKER">;
            type: z.ZodLiteral<"date">;
            metadata: z.ZodOptional<z.ZodObject<{
                show_time: z.ZodOptional<z.ZodBoolean>;
                timezone: z.ZodOptional<z.ZodEnum<{
                    local: "local";
                    utc: "utc";
                }>>;
            }, z.core.$catchall<z.ZodUnknown>>>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"keyword">;
            display: z.ZodOptional<z.ZodObject<{
                show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
            }, z.core.$strip>>;
            validation: z.ZodOptional<z.ZodObject<{
                required: z.ZodOptional<z.ZodBoolean>;
                required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
                pattern: z.ZodOptional<z.ZodObject<{
                    regex: z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
                min_length: z.ZodOptional<z.ZodNumber>;
                max_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            control: z.ZodLiteral<"USER_PICKER">;
            metadata: z.ZodOptional<z.ZodObject<{
                multiple: z.ZodOptional<z.ZodBoolean>;
                default: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    uid: z.ZodString;
                    name: z.ZodString;
                }, z.core.$strip>>>;
            }, z.core.$catchall<z.ZodUnknown>>>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"keyword">;
            display: z.ZodOptional<z.ZodObject<{
                show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
            }, z.core.$strip>>;
            validation: z.ZodOptional<z.ZodObject<{
                required: z.ZodOptional<z.ZodBoolean>;
                required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
                pattern: z.ZodOptional<z.ZodObject<{
                    regex: z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
                min_length: z.ZodOptional<z.ZodNumber>;
                max_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            control: z.ZodLiteral<"CHECKBOX_GROUP">;
            metadata: z.ZodObject<{
                options: z.ZodArray<z.ZodString>;
                default: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$catchall<z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"keyword">;
            display: z.ZodOptional<z.ZodObject<{
                show_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
            }, z.core.$strip>>;
            validation: z.ZodOptional<z.ZodObject<{
                required: z.ZodOptional<z.ZodBoolean>;
                required_when: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    field: z.ZodString;
                    operator: z.ZodEnum<{
                        empty: "empty";
                        contains: "contains";
                        eq: "eq";
                        neq: "neq";
                        not_empty: "not_empty";
                    }>;
                    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                }, z.core.$strip>, z.ZodObject<{
                    combine: z.ZodDefault<z.ZodEnum<{
                        all: "all";
                        any: "any";
                    }>>;
                    rules: z.ZodArray<z.ZodObject<{
                        field: z.ZodString;
                        operator: z.ZodEnum<{
                            empty: "empty";
                            contains: "contains";
                            eq: "eq";
                            neq: "neq";
                            not_empty: "not_empty";
                        }>;
                        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>]>>;
                pattern: z.ZodOptional<z.ZodObject<{
                    regex: z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
                min_length: z.ZodOptional<z.ZodNumber>;
                max_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            control: z.ZodLiteral<"RADIO_GROUP">;
            metadata: z.ZodObject<{
                options: z.ZodArray<z.ZodString>;
                default: z.ZodOptional<z.ZodString>;
            }, z.core.$catchall<z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            $ref: z.ZodString;
            metadata: z.ZodOptional<z.ZodObject<{
                default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                    uid: z.ZodString;
                    name: z.ZodString;
                }, z.core.$strip>>]>>;
            }, z.core.$strip>>;
        }, z.core.$strip>]>>;
    }, z.core.$strip>;
    definitionString: z.ZodString;
    isLatest: z.ZodBoolean;
    latestVersion: z.ZodNumber;
}, z.core.$strip>;
export type ParsedTemplate = z.infer<typeof ParsedTemplateSchema>;
/**
 * Input for creating a new template
 */
export declare const CreateTemplateInputSchema: z.ZodObject<{
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    definition: z.ZodString;
    fieldNames: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        label: z.ZodString;
        type: z.ZodString;
        control: z.ZodString;
    }, z.core.$strip>>>;
    owner: z.ZodString;
    isEnabled: z.ZodOptional<z.ZodBoolean>;
    author: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    fieldCount: z.ZodOptional<z.ZodNumber>;
    usageCount: z.ZodOptional<z.ZodNumber>;
    lastUsedAt: z.ZodOptional<z.ZodString>;
    isLatest: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateInputSchema>;
/**
 * Input for updating an existing template (PUT - full replacement)
 */
export declare const UpdateTemplateInputSchema: z.ZodObject<{
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    definition: z.ZodString;
    fieldNames: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        label: z.ZodString;
        type: z.ZodString;
        control: z.ZodString;
    }, z.core.$strip>>>;
    owner: z.ZodString;
    isEnabled: z.ZodOptional<z.ZodBoolean>;
    author: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    fieldCount: z.ZodOptional<z.ZodNumber>;
    usageCount: z.ZodOptional<z.ZodNumber>;
    lastUsedAt: z.ZodOptional<z.ZodString>;
    isLatest: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateInputSchema>;
/**
 * Input for patching an existing template (PATCH - partial update)
 * All fields are optional to allow partial updates
 */
export declare const PatchTemplateInputSchema: z.ZodObject<{
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    definition: z.ZodOptional<z.ZodString>;
    fieldNames: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        label: z.ZodString;
        type: z.ZodString;
        control: z.ZodString;
    }, z.core.$strip>>>>;
    owner: z.ZodOptional<z.ZodString>;
    isEnabled: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    author: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isDefault: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    fieldCount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    usageCount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    lastUsedAt: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isLatest: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type PatchTemplateInput = z.infer<typeof PatchTemplateInputSchema>;
