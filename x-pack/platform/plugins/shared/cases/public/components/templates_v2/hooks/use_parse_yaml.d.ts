import { z } from '@kbn/zod/v4';
import type { ValidatedFile } from './use_validate_yaml';
declare const ImportedTemplateSchema: z.ZodObject<{
    templateId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    owner: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    severity: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    author: z.ZodOptional<z.ZodString>;
    templateVersion: z.ZodOptional<z.ZodNumber>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    definition: z.ZodOptional<z.ZodObject<{
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
    }, z.core.$strip>>;
}, z.core.$strip>;
type ImportedTemplate = z.infer<typeof ImportedTemplateSchema>;
export interface ParsedTemplateEntry {
    templateId?: string;
    name: string;
    owner?: string;
    description?: string;
    tags?: string[];
    severity?: string;
    category?: string | null;
    author?: string;
    definition?: ImportedTemplate['definition'];
    sourceFileName: string;
    documentIndex: number;
    existsOnServer: boolean;
}
export interface ParseYamlError {
    fileName: string;
    documentIndex: number;
    message: string;
}
export interface ParseYamlResult {
    templates: ParsedTemplateEntry[];
    errors: ParseYamlError[];
}
export declare const useParseYaml: () => {
    parseFiles: (validatedFiles: ValidatedFile[]) => Promise<ParseYamlResult>;
};
export {};
