import * as rt from 'io-ts';
import type { Configurations, Configuration } from '../../domain/configure/v1';
export declare const CustomFieldConfigurationWithoutTypeRt: rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.Type<string, string, unknown>;
    /**
     * label of custom field
     */
    label: rt.Type<string, string, unknown>;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>;
export declare const TextCustomFieldConfigurationRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../../domain").CustomFieldTypes.TEXT>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.Type<string, string, unknown>;
    /**
     * label of custom field
     */
    label: rt.Type<string, string, unknown>;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.Type<string, string, unknown>, rt.NullC]>;
}>>]>;
export declare const ToggleCustomFieldConfigurationRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../../domain").CustomFieldTypes.TOGGLE>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.Type<string, string, unknown>;
    /**
     * label of custom field
     */
    label: rt.Type<string, string, unknown>;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.BooleanC, rt.NullC]>;
}>>]>;
export declare const NumberCustomFieldConfigurationRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../../domain").CustomFieldTypes.NUMBER>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.Type<string, string, unknown>;
    /**
     * label of custom field
     */
    label: rt.Type<string, string, unknown>;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.Type<number, number, unknown>, rt.NullC]>;
}>>]>;
export declare const CustomFieldsConfigurationRt: rt.Type<(({
    type: import("../../domain").CustomFieldTypes.TEXT;
} & {
    key: string;
    label: string;
    required: boolean;
} & {
    defaultValue?: string | null | undefined;
}) | ({
    type: import("../../domain").CustomFieldTypes.TOGGLE;
} & {
    key: string;
    label: string;
    required: boolean;
} & {
    defaultValue?: boolean | null | undefined;
}) | ({
    type: import("../../domain").CustomFieldTypes.NUMBER;
} & {
    key: string;
    label: string;
    required: boolean;
} & {
    defaultValue?: number | null | undefined;
}))[], (({
    type: import("../../domain").CustomFieldTypes.TEXT;
} & {
    key: string;
    label: string;
    required: boolean;
} & {
    defaultValue?: string | null | undefined;
}) | ({
    type: import("../../domain").CustomFieldTypes.TOGGLE;
} & {
    key: string;
    label: string;
    required: boolean;
} & {
    defaultValue?: boolean | null | undefined;
}) | ({
    type: import("../../domain").CustomFieldTypes.NUMBER;
} & {
    key: string;
    label: string;
    required: boolean;
} & {
    defaultValue?: number | null | undefined;
}))[], unknown>;
export declare const ObservableTypesConfigurationRt: rt.Type<{
    key: string;
    label: string;
}[], {
    key: string;
    label: string;
}[], unknown>;
export declare const TemplateConfigurationRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * key of template
     */
    key: rt.Type<string, string, unknown>;
    /**
     * name of template
     */
    name: rt.Type<string, string, unknown>;
    /**
     * case fields
     */
    caseFields: rt.UnionC<[rt.NullC, rt.ExactC<rt.PartialC<{
        description: rt.Type<string, string, unknown>;
        tags: rt.Type<string[], string[], unknown>;
        title: rt.Type<string, string, unknown>;
        connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
        }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ConnectorTypes.jira>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
                priority: rt.UnionC<[rt.StringC, rt.NullC]>;
                parent: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ConnectorTypes.resilient>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
                severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ConnectorTypes.serviceNowITSM>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                impact: rt.UnionC<[rt.StringC, rt.NullC]>;
                severity: rt.UnionC<[rt.StringC, rt.NullC]>;
                urgency: rt.UnionC<[rt.StringC, rt.NullC]>;
                category: rt.UnionC<[rt.StringC, rt.NullC]>;
                subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ConnectorTypes.serviceNowSIR>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                category: rt.UnionC<[rt.StringC, rt.NullC]>;
                destIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                malwareHash: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                malwareUrl: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                priority: rt.UnionC<[rt.StringC, rt.NullC]>;
                sourceIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ConnectorTypes.theHive>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>]>]>;
        severity: rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>;
        assignees: rt.Type<{
            uid: string;
        }[], {
            uid: string;
        }[], unknown>;
        category: rt.UnionC<[rt.Type<string, string, unknown>, rt.NullC]>;
        customFields: rt.Type<({
            key: string;
            type: import("../../domain").CustomFieldTypes.TOGGLE;
            value: boolean | null;
        } | {
            key: string;
            type: import("../../domain").CustomFieldTypes.TEXT;
            value: string | null;
        } | {
            key: string;
            type: import("../../domain").CustomFieldTypes.NUMBER;
            value: number | null;
        })[], ({
            key: string;
            type: import("../../domain").CustomFieldTypes.TOGGLE;
            value: boolean | null;
        } | {
            key: string;
            type: import("../../domain").CustomFieldTypes.TEXT;
            value: string | null;
        } | {
            key: string;
            type: import("../../domain").CustomFieldTypes.NUMBER;
            value: number | null;
        })[], unknown>;
        settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            syncAlerts: rt.BooleanC;
        }>>, rt.ExactC<rt.PartialC<{
            extractObservables: rt.BooleanC;
        }>>]>;
        template: rt.UnionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.NumberC;
        }>>, rt.NullC]>;
        extended_fields: rt.UnionC<[rt.UndefinedC, rt.RecordC<rt.StringC, rt.StringC>]>;
        closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
    }>>]>;
}>>, rt.ExactC<rt.PartialC<{
    /**
     * description of templates
     */
    description: rt.Type<string, string, unknown>;
    /**
     * tags of templates
     */
    tags: rt.Type<string[], string[], unknown>;
}>>]>;
export declare const TemplatesConfigurationRt: rt.Type<({
    key: string;
    name: string;
    caseFields: {
        description?: string | undefined;
        tags?: string[] | undefined;
        title?: string | undefined;
        connector?: ({
            id: string;
        } & (({
            type: import("../../domain").ConnectorTypes.casesWebhook;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.jira;
            fields: ({
                issueType: string | null;
                priority: string | null;
                parent: string | null;
            } & {
                otherFields?: string | null | undefined;
            }) | null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.none;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.resilient;
            fields: ({
                incidentTypes: string[] | null;
                severityCode: string | null;
            } & {
                additionalFields?: string | null | undefined;
            }) | null;
        } & {
            additionalFields?: string | null | undefined;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.serviceNowITSM;
            fields: ({
                impact: string | null;
                severity: string | null;
                urgency: string | null;
                category: string | null;
                subcategory: string | null;
            } & {
                additionalFields?: string | null | undefined;
            }) | null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.serviceNowSIR;
            fields: ({
                category: string | null;
                destIp: boolean | null;
                malwareHash: boolean | null;
                malwareUrl: boolean | null;
                priority: string | null;
                sourceIp: boolean | null;
                subcategory: string | null;
            } & {
                additionalFields?: string | null | undefined;
            }) | null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
        } & {
            name: string;
        }))) | undefined;
        severity?: import("../../domain").CaseSeverity | undefined;
        assignees?: {
            uid: string;
        }[] | undefined;
        category?: string | null | undefined;
        customFields?: ({
            key: string;
            type: import("../../domain").CustomFieldTypes.TOGGLE;
            value: boolean | null;
        } | {
            key: string;
            type: import("../../domain").CustomFieldTypes.TEXT;
            value: string | null;
        } | {
            key: string;
            type: import("../../domain").CustomFieldTypes.NUMBER;
            value: number | null;
        })[] | undefined;
        settings?: ({
            syncAlerts: boolean;
        } & {
            extractObservables?: boolean | undefined;
        }) | undefined;
        template?: {
            id: string;
            version: number;
        } | null | undefined;
        extended_fields?: {
            [x: string]: string;
        } | undefined;
        closeReason?: string | undefined;
    } | null;
} & {
    description?: string | undefined;
    tags?: string[] | undefined;
})[], ({
    key: string;
    name: string;
    caseFields: {
        description?: string | undefined;
        tags?: string[] | undefined;
        title?: string | undefined;
        connector?: ({
            id: string;
        } & (({
            type: import("../../domain").ConnectorTypes.casesWebhook;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.jira;
            fields: ({
                issueType: string | null;
                priority: string | null;
                parent: string | null;
            } & {
                otherFields?: string | null | undefined;
            }) | null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.none;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.resilient;
            fields: ({
                incidentTypes: string[] | null;
                severityCode: string | null;
            } & {
                additionalFields?: string | null | undefined;
            }) | null;
        } & {
            additionalFields?: string | null | undefined;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.serviceNowITSM;
            fields: ({
                impact: string | null;
                severity: string | null;
                urgency: string | null;
                category: string | null;
                subcategory: string | null;
            } & {
                additionalFields?: string | null | undefined;
            }) | null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.serviceNowSIR;
            fields: ({
                category: string | null;
                destIp: boolean | null;
                malwareHash: boolean | null;
                malwareUrl: boolean | null;
                priority: string | null;
                sourceIp: boolean | null;
                subcategory: string | null;
            } & {
                additionalFields?: string | null | undefined;
            }) | null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
        } & {
            name: string;
        }) | ({
            type: import("../../domain").ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
        } & {
            name: string;
        }))) | undefined;
        severity?: import("../../domain").CaseSeverity | undefined;
        assignees?: {
            uid: string;
        }[] | undefined;
        category?: string | null | undefined;
        customFields?: ({
            key: string;
            type: import("../../domain").CustomFieldTypes.TOGGLE;
            value: boolean | null;
        } | {
            key: string;
            type: import("../../domain").CustomFieldTypes.TEXT;
            value: string | null;
        } | {
            key: string;
            type: import("../../domain").CustomFieldTypes.NUMBER;
            value: number | null;
        })[] | undefined;
        settings?: ({
            syncAlerts: boolean;
        } & {
            extractObservables?: boolean | undefined;
        }) | undefined;
        template?: {
            id: string;
            version: number;
        } | null | undefined;
        extended_fields?: {
            [x: string]: string;
        } | undefined;
        closeReason?: string | undefined;
    } | null;
} & {
    description?: string | undefined;
    tags?: string[] | undefined;
})[], unknown>;
export declare const ConfigurationRequestRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * The external connector
     */
    connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.casesWebhook>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.jira>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
            priority: rt.UnionC<[rt.StringC, rt.NullC]>;
            parent: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.none>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.resilient>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
            severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.serviceNowITSM>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            impact: rt.UnionC<[rt.StringC, rt.NullC]>;
            severity: rt.UnionC<[rt.StringC, rt.NullC]>;
            urgency: rt.UnionC<[rt.StringC, rt.NullC]>;
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.serviceNowSIR>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            destIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            malwareHash: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            malwareUrl: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            priority: rt.UnionC<[rt.StringC, rt.NullC]>;
            sourceIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.swimlane>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.theHive>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>]>]>;
    /**
     * Whether to close the case after it has been synced with the external system
     */
    closure_type: rt.UnionC<[rt.LiteralC<"close-by-user">, rt.LiteralC<"close-by-pushing">]>;
    /**
     * The plugin owner that manages this configuration
     */
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    customFields: rt.Type<(({
        type: import("../../domain").CustomFieldTypes.TEXT;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: string | null | undefined;
    }) | ({
        type: import("../../domain").CustomFieldTypes.TOGGLE;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: boolean | null | undefined;
    }) | ({
        type: import("../../domain").CustomFieldTypes.NUMBER;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: number | null | undefined;
    }))[], (({
        type: import("../../domain").CustomFieldTypes.TEXT;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: string | null | undefined;
    }) | ({
        type: import("../../domain").CustomFieldTypes.TOGGLE;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: boolean | null | undefined;
    }) | ({
        type: import("../../domain").CustomFieldTypes.NUMBER;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: number | null | undefined;
    }))[], unknown>;
    templates: rt.Type<({
        key: string;
        name: string;
        caseFields: {
            description?: string | undefined;
            tags?: string[] | undefined;
            title?: string | undefined;
            connector?: ({
                id: string;
            } & (({
                type: import("../../domain").ConnectorTypes.casesWebhook;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.jira;
                fields: ({
                    issueType: string | null;
                    priority: string | null;
                    parent: string | null;
                } & {
                    otherFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.none;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.resilient;
                fields: ({
                    incidentTypes: string[] | null;
                    severityCode: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                additionalFields?: string | null | undefined;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.serviceNowITSM;
                fields: ({
                    impact: string | null;
                    severity: string | null;
                    urgency: string | null;
                    category: string | null;
                    subcategory: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.serviceNowSIR;
                fields: ({
                    category: string | null;
                    destIp: boolean | null;
                    malwareHash: boolean | null;
                    malwareUrl: boolean | null;
                    priority: string | null;
                    sourceIp: boolean | null;
                    subcategory: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.swimlane;
                fields: {
                    caseId: string | null;
                } | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.theHive;
                fields: {
                    tlp: number | null;
                } | null;
            } & {
                name: string;
            }))) | undefined;
            severity?: import("../../domain").CaseSeverity | undefined;
            assignees?: {
                uid: string;
            }[] | undefined;
            category?: string | null | undefined;
            customFields?: ({
                key: string;
                type: import("../../domain").CustomFieldTypes.TOGGLE;
                value: boolean | null;
            } | {
                key: string;
                type: import("../../domain").CustomFieldTypes.TEXT;
                value: string | null;
            } | {
                key: string;
                type: import("../../domain").CustomFieldTypes.NUMBER;
                value: number | null;
            })[] | undefined;
            settings?: ({
                syncAlerts: boolean;
            } & {
                extractObservables?: boolean | undefined;
            }) | undefined;
            template?: {
                id: string;
                version: number;
            } | null | undefined;
            extended_fields?: {
                [x: string]: string;
            } | undefined;
            closeReason?: string | undefined;
        } | null;
    } & {
        description?: string | undefined;
        tags?: string[] | undefined;
    })[], ({
        key: string;
        name: string;
        caseFields: {
            description?: string | undefined;
            tags?: string[] | undefined;
            title?: string | undefined;
            connector?: ({
                id: string;
            } & (({
                type: import("../../domain").ConnectorTypes.casesWebhook;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.jira;
                fields: ({
                    issueType: string | null;
                    priority: string | null;
                    parent: string | null;
                } & {
                    otherFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.none;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.resilient;
                fields: ({
                    incidentTypes: string[] | null;
                    severityCode: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                additionalFields?: string | null | undefined;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.serviceNowITSM;
                fields: ({
                    impact: string | null;
                    severity: string | null;
                    urgency: string | null;
                    category: string | null;
                    subcategory: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.serviceNowSIR;
                fields: ({
                    category: string | null;
                    destIp: boolean | null;
                    malwareHash: boolean | null;
                    malwareUrl: boolean | null;
                    priority: string | null;
                    sourceIp: boolean | null;
                    subcategory: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.swimlane;
                fields: {
                    caseId: string | null;
                } | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.theHive;
                fields: {
                    tlp: number | null;
                } | null;
            } & {
                name: string;
            }))) | undefined;
            severity?: import("../../domain").CaseSeverity | undefined;
            assignees?: {
                uid: string;
            }[] | undefined;
            category?: string | null | undefined;
            customFields?: ({
                key: string;
                type: import("../../domain").CustomFieldTypes.TOGGLE;
                value: boolean | null;
            } | {
                key: string;
                type: import("../../domain").CustomFieldTypes.TEXT;
                value: string | null;
            } | {
                key: string;
                type: import("../../domain").CustomFieldTypes.NUMBER;
                value: number | null;
            })[] | undefined;
            settings?: ({
                syncAlerts: boolean;
            } & {
                extractObservables?: boolean | undefined;
            }) | undefined;
            template?: {
                id: string;
                version: number;
            } | null | undefined;
            extended_fields?: {
                [x: string]: string;
            } | undefined;
            closeReason?: string | undefined;
        } | null;
    } & {
        description?: string | undefined;
        tags?: string[] | undefined;
    })[], unknown>;
    observableTypes: rt.Type<{
        key: string;
        label: string;
    }[], {
        key: string;
        label: string;
    }[], unknown>;
}>>]>;
export declare const GetConfigurationFindRequestRt: rt.ExactC<rt.PartialC<{
    /**
     * The configuration plugin owner to filter the search by. If this is left empty the results will include all configurations
     * that the user has permissions to access
     */
    owner: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
}>>;
export declare const CaseConfigureRequestParamsRt: rt.ExactC<rt.TypeC<{
    configuration_id: rt.StringC;
}>>;
export declare const ConfigurationPatchRequestRt: rt.IntersectionC<[rt.ExactC<rt.PartialC<{
    closure_type: rt.UnionC<[rt.LiteralC<"close-by-user">, rt.LiteralC<"close-by-pushing">]>;
    connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.casesWebhook>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.jira>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
            priority: rt.UnionC<[rt.StringC, rt.NullC]>;
            parent: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.none>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.resilient>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
            severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.serviceNowITSM>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            impact: rt.UnionC<[rt.StringC, rt.NullC]>;
            severity: rt.UnionC<[rt.StringC, rt.NullC]>;
            urgency: rt.UnionC<[rt.StringC, rt.NullC]>;
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.serviceNowSIR>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            destIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            malwareHash: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            malwareUrl: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            priority: rt.UnionC<[rt.StringC, rt.NullC]>;
            sourceIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.swimlane>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ConnectorTypes.theHive>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>]>]>;
    customFields: rt.Type<(({
        type: import("../../domain").CustomFieldTypes.TEXT;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: string | null | undefined;
    }) | ({
        type: import("../../domain").CustomFieldTypes.TOGGLE;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: boolean | null | undefined;
    }) | ({
        type: import("../../domain").CustomFieldTypes.NUMBER;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: number | null | undefined;
    }))[], (({
        type: import("../../domain").CustomFieldTypes.TEXT;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: string | null | undefined;
    }) | ({
        type: import("../../domain").CustomFieldTypes.TOGGLE;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: boolean | null | undefined;
    }) | ({
        type: import("../../domain").CustomFieldTypes.NUMBER;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: number | null | undefined;
    }))[], unknown>;
    templates: rt.Type<({
        key: string;
        name: string;
        caseFields: {
            description?: string | undefined;
            tags?: string[] | undefined;
            title?: string | undefined;
            connector?: ({
                id: string;
            } & (({
                type: import("../../domain").ConnectorTypes.casesWebhook;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.jira;
                fields: ({
                    issueType: string | null;
                    priority: string | null;
                    parent: string | null;
                } & {
                    otherFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.none;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.resilient;
                fields: ({
                    incidentTypes: string[] | null;
                    severityCode: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                additionalFields?: string | null | undefined;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.serviceNowITSM;
                fields: ({
                    impact: string | null;
                    severity: string | null;
                    urgency: string | null;
                    category: string | null;
                    subcategory: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.serviceNowSIR;
                fields: ({
                    category: string | null;
                    destIp: boolean | null;
                    malwareHash: boolean | null;
                    malwareUrl: boolean | null;
                    priority: string | null;
                    sourceIp: boolean | null;
                    subcategory: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.swimlane;
                fields: {
                    caseId: string | null;
                } | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.theHive;
                fields: {
                    tlp: number | null;
                } | null;
            } & {
                name: string;
            }))) | undefined;
            severity?: import("../../domain").CaseSeverity | undefined;
            assignees?: {
                uid: string;
            }[] | undefined;
            category?: string | null | undefined;
            customFields?: ({
                key: string;
                type: import("../../domain").CustomFieldTypes.TOGGLE;
                value: boolean | null;
            } | {
                key: string;
                type: import("../../domain").CustomFieldTypes.TEXT;
                value: string | null;
            } | {
                key: string;
                type: import("../../domain").CustomFieldTypes.NUMBER;
                value: number | null;
            })[] | undefined;
            settings?: ({
                syncAlerts: boolean;
            } & {
                extractObservables?: boolean | undefined;
            }) | undefined;
            template?: {
                id: string;
                version: number;
            } | null | undefined;
            extended_fields?: {
                [x: string]: string;
            } | undefined;
            closeReason?: string | undefined;
        } | null;
    } & {
        description?: string | undefined;
        tags?: string[] | undefined;
    })[], ({
        key: string;
        name: string;
        caseFields: {
            description?: string | undefined;
            tags?: string[] | undefined;
            title?: string | undefined;
            connector?: ({
                id: string;
            } & (({
                type: import("../../domain").ConnectorTypes.casesWebhook;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.jira;
                fields: ({
                    issueType: string | null;
                    priority: string | null;
                    parent: string | null;
                } & {
                    otherFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.none;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.resilient;
                fields: ({
                    incidentTypes: string[] | null;
                    severityCode: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                additionalFields?: string | null | undefined;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.serviceNowITSM;
                fields: ({
                    impact: string | null;
                    severity: string | null;
                    urgency: string | null;
                    category: string | null;
                    subcategory: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.serviceNowSIR;
                fields: ({
                    category: string | null;
                    destIp: boolean | null;
                    malwareHash: boolean | null;
                    malwareUrl: boolean | null;
                    priority: string | null;
                    sourceIp: boolean | null;
                    subcategory: string | null;
                } & {
                    additionalFields?: string | null | undefined;
                }) | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.swimlane;
                fields: {
                    caseId: string | null;
                } | null;
            } & {
                name: string;
            }) | ({
                type: import("../../domain").ConnectorTypes.theHive;
                fields: {
                    tlp: number | null;
                } | null;
            } & {
                name: string;
            }))) | undefined;
            severity?: import("../../domain").CaseSeverity | undefined;
            assignees?: {
                uid: string;
            }[] | undefined;
            category?: string | null | undefined;
            customFields?: ({
                key: string;
                type: import("../../domain").CustomFieldTypes.TOGGLE;
                value: boolean | null;
            } | {
                key: string;
                type: import("../../domain").CustomFieldTypes.TEXT;
                value: string | null;
            } | {
                key: string;
                type: import("../../domain").CustomFieldTypes.NUMBER;
                value: number | null;
            })[] | undefined;
            settings?: ({
                syncAlerts: boolean;
            } & {
                extractObservables?: boolean | undefined;
            }) | undefined;
            template?: {
                id: string;
                version: number;
            } | null | undefined;
            extended_fields?: {
                [x: string]: string;
            } | undefined;
            closeReason?: string | undefined;
        } | null;
    } & {
        description?: string | undefined;
        tags?: string[] | undefined;
    })[], unknown>;
    observableTypes: rt.Type<{
        key: string;
        label: string;
    }[], {
        key: string;
        label: string;
    }[], unknown>;
}>>, rt.ExactC<rt.TypeC<{
    version: rt.StringC;
}>>]>;
export type ConfigurationRequest = rt.TypeOf<typeof ConfigurationRequestRt>;
export type ConfigurationPatchRequest = rt.TypeOf<typeof ConfigurationPatchRequestRt>;
export type GetConfigurationFindRequest = rt.TypeOf<typeof GetConfigurationFindRequestRt>;
export type GetConfigureResponse = Configurations;
export type CreateConfigureResponse = Configuration;
export type UpdateConfigureResponse = Configuration;
