import { z } from '@kbn/zod/v4';
export declare const FieldType: {
    readonly INPUT_TEXT: "INPUT_TEXT";
    readonly INPUT_NUMBER: "INPUT_NUMBER";
    readonly SELECT_BASIC: "SELECT_BASIC";
    readonly TEXTAREA: "TEXTAREA";
    readonly DATE_PICKER: "DATE_PICKER";
    readonly CHECKBOX_GROUP: "CHECKBOX_GROUP";
    readonly RADIO_GROUP: "RADIO_GROUP";
    readonly USER_PICKER: "USER_PICKER";
};
export type FieldType = (typeof FieldType)[keyof typeof FieldType];
export declare const ConditionRuleSchema: z.ZodObject<{
    field: z.ZodString;
    operator: z.ZodEnum<{
        empty: "empty";
        contains: "contains";
        eq: "eq";
        neq: "neq";
        not_empty: "not_empty";
    }>;
    value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
}, z.core.$strip>;
export declare const CompoundConditionSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const ConditionSchema: z.ZodUnion<readonly [z.ZodObject<{
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
}, z.core.$strip>]>;
export declare const DisplaySchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const ValidationSchema: z.ZodObject<{
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
}, z.core.$strip>;
export type ConditionRule = z.infer<typeof ConditionRuleSchema>;
export type CompoundCondition = z.infer<typeof CompoundConditionSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type Display = z.infer<typeof DisplaySchema>;
export type Validation = z.infer<typeof ValidationSchema>;
/**
 * Extra props passed to control components by the field renderer based on evaluated conditions.
 */
export interface ConditionRenderProps {
    isRequired?: boolean;
    patternValidation?: {
        regex: string;
        message?: string;
    };
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
}
export declare const InputTextFieldSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const InputNumberFieldSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const SelectBasicFieldSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const TextareaFieldSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const DatePickerFieldSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const UserPickerDefaultSchema: z.ZodArray<z.ZodObject<{
    uid: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>>;
export declare const UserPickerFieldSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const CheckboxGroupFieldSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const RadioGroupFieldSchema: z.ZodObject<{
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
}, z.core.$strip>;
/**
 * A reference to a named field definition in the owner's field library.
 * When a template is parsed, the referenced field is resolved by looking up the library
 * field by its `$ref` name. `name` is an optional local alias; if omitted the `$ref` value
 * is used as the effective field name within the template.
 *
 * `metadata.default` is an optional per-template override for the resolved field's default
 * value. It must satisfy the resolved field's control type — this is enforced when the
 * override is merged onto the inline field at resolve time.
 */
export declare const RefFieldSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    $ref: z.ZodString;
    metadata: z.ZodOptional<z.ZodObject<{
        default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
            uid: z.ZodString;
            name: z.ZodString;
        }, z.core.$strip>>]>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type RefField = z.infer<typeof RefFieldSchema>;
/**
 * This can be used to parse `fields` section in the YAML `definition` of the template.
 * Includes both inline field definitions (with `control`) and library references (with `ref`).
 */
export declare const FieldSchema: z.ZodUnion<readonly [z.ZodObject<{
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
}, z.core.$strip>]>;
export type Field = z.infer<typeof FieldSchema>;
/** Union of all inline (control-based) field types — excludes RefField. */
export type InlineField = Exclude<Field, RefField>;
export declare const isRefField: (field: Field) => field is RefField;
export declare const isInlineField: (field: Field) => field is InlineField;
