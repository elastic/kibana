import * as rt from 'io-ts';
import { CaseObservableTypeRt } from '../observable/v1';
export declare const ClosureTypeRt: rt.UnionC<[rt.LiteralC<"close-by-user">, rt.LiteralC<"close-by-pushing">]>;
export declare const CustomFieldConfigurationWithoutTypeRt: rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.StringC;
    /**
     * label of custom field
     */
    label: rt.StringC;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>;
export declare const TextCustomFieldConfigurationRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.StringC;
    /**
     * label of custom field
     */
    label: rt.StringC;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>;
export declare const ToggleCustomFieldConfigurationRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.StringC;
    /**
     * label of custom field
     */
    label: rt.StringC;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.BooleanC, rt.NullC]>;
}>>]>;
export declare const NumberCustomFieldConfigurationRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.StringC;
    /**
     * label of custom field
     */
    label: rt.StringC;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>>]>;
export declare const CustomFieldConfigurationRt: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.StringC;
    /**
     * label of custom field
     */
    label: rt.StringC;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.StringC;
    /**
     * label of custom field
     */
    label: rt.StringC;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.BooleanC, rt.NullC]>;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.StringC;
    /**
     * label of custom field
     */
    label: rt.StringC;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>>]>]>;
export declare const CustomFieldsConfigurationRt: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.StringC;
    /**
     * label of custom field
     */
    label: rt.StringC;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.StringC;
    /**
     * label of custom field
     */
    label: rt.StringC;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.BooleanC, rt.NullC]>;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * key of custom field
     */
    key: rt.StringC;
    /**
     * label of custom field
     */
    label: rt.StringC;
    /**
     * custom field options - required
     */
    required: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    defaultValue: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>>]>]>>;
export declare const ObservableTypesConfigurationRt: rt.ArrayC<rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    label: rt.StringC;
}>>>;
export declare const TemplateConfigurationRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * key of template
     */
    key: rt.StringC;
    /**
     * name of template
     */
    name: rt.StringC;
    /**
     * case fields of template
     */
    caseFields: rt.UnionC<[rt.NullC, rt.ExactC<rt.PartialC<{
        description: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
        title: rt.StringC;
        connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
        }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>]>]>;
        severity: rt.UnionC<[rt.LiteralC<import("../case/v1").CaseSeverity.LOW>, rt.LiteralC<import("../case/v1").CaseSeverity.MEDIUM>, rt.LiteralC<import("../case/v1").CaseSeverity.HIGH>, rt.LiteralC<import("../case/v1").CaseSeverity.CRITICAL>]>;
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
        customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>]>>;
        settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            syncAlerts: rt.BooleanC;
        }>>, rt.ExactC<rt.PartialC<{
            extractObservables: rt.BooleanC;
        }>>]>;
        observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            createdAt: rt.StringC;
            updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            typeKey: rt.StringC;
            value: rt.StringC;
            description: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>>;
    }>>]>;
}>>, rt.ExactC<rt.PartialC<{
    /**
     * description of template
     */
    description: rt.StringC;
    /**
     * tags of template
     */
    tags: rt.ArrayC<rt.StringC>;
}>>]>;
export declare const TemplatesConfigurationRt: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * key of template
     */
    key: rt.StringC;
    /**
     * name of template
     */
    name: rt.StringC;
    /**
     * case fields of template
     */
    caseFields: rt.UnionC<[rt.NullC, rt.ExactC<rt.PartialC<{
        description: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
        title: rt.StringC;
        connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
        }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>]>]>;
        severity: rt.UnionC<[rt.LiteralC<import("../case/v1").CaseSeverity.LOW>, rt.LiteralC<import("../case/v1").CaseSeverity.MEDIUM>, rt.LiteralC<import("../case/v1").CaseSeverity.HIGH>, rt.LiteralC<import("../case/v1").CaseSeverity.CRITICAL>]>;
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
        customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>]>>;
        settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            syncAlerts: rt.BooleanC;
        }>>, rt.ExactC<rt.PartialC<{
            extractObservables: rt.BooleanC;
        }>>]>;
        observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            createdAt: rt.StringC;
            updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            typeKey: rt.StringC;
            value: rt.StringC;
            description: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>>;
    }>>]>;
}>>, rt.ExactC<rt.PartialC<{
    /**
     * description of template
     */
    description: rt.StringC;
    /**
     * tags of template
     */
    tags: rt.ArrayC<rt.StringC>;
}>>]>>;
export declare const ConfigurationBasicWithoutOwnerRt: rt.ExactC<rt.TypeC<{
    /**
     * The external connector
     */
    connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
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
     * The custom fields configured for the case
     */
    customFields: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>]>]>>;
    /**
     * Templates configured for the case
     */
    templates: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        /**
         * key of template
         */
        key: rt.StringC;
        /**
         * name of template
         */
        name: rt.StringC;
        /**
         * case fields of template
         */
        caseFields: rt.UnionC<[rt.NullC, rt.ExactC<rt.PartialC<{
            description: rt.StringC;
            tags: rt.ArrayC<rt.StringC>;
            title: rt.StringC;
            connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
            }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>]>]>;
            severity: rt.UnionC<[rt.LiteralC<import("../case/v1").CaseSeverity.LOW>, rt.LiteralC<import("../case/v1").CaseSeverity.MEDIUM>, rt.LiteralC<import("../case/v1").CaseSeverity.HIGH>, rt.LiteralC<import("../case/v1").CaseSeverity.CRITICAL>]>;
            assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
                uid: rt.StringC;
            }>>>;
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
                value: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
                value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>]>>;
            settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                syncAlerts: rt.BooleanC;
            }>>, rt.ExactC<rt.PartialC<{
                extractObservables: rt.BooleanC;
            }>>]>;
            observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
                createdAt: rt.StringC;
                updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                typeKey: rt.StringC;
                value: rt.StringC;
                description: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>>;
        }>>]>;
    }>>, rt.ExactC<rt.PartialC<{
        /**
         * description of template
         */
        description: rt.StringC;
        /**
         * tags of template
         */
        tags: rt.ArrayC<rt.StringC>;
    }>>]>>;
    /**
     * Observable types configured for the case
     */
    observableTypes: rt.ArrayC<rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
    }>>>;
}>>;
export declare const CasesConfigureBasicRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * The external connector
     */
    connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
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
     * The custom fields configured for the case
     */
    customFields: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>]>]>>;
    /**
     * Templates configured for the case
     */
    templates: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        /**
         * key of template
         */
        key: rt.StringC;
        /**
         * name of template
         */
        name: rt.StringC;
        /**
         * case fields of template
         */
        caseFields: rt.UnionC<[rt.NullC, rt.ExactC<rt.PartialC<{
            description: rt.StringC;
            tags: rt.ArrayC<rt.StringC>;
            title: rt.StringC;
            connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
            }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>]>]>;
            severity: rt.UnionC<[rt.LiteralC<import("../case/v1").CaseSeverity.LOW>, rt.LiteralC<import("../case/v1").CaseSeverity.MEDIUM>, rt.LiteralC<import("../case/v1").CaseSeverity.HIGH>, rt.LiteralC<import("../case/v1").CaseSeverity.CRITICAL>]>;
            assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
                uid: rt.StringC;
            }>>>;
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
                value: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
                value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>]>>;
            settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                syncAlerts: rt.BooleanC;
            }>>, rt.ExactC<rt.PartialC<{
                extractObservables: rt.BooleanC;
            }>>]>;
            observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
                createdAt: rt.StringC;
                updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                typeKey: rt.StringC;
                value: rt.StringC;
                description: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>>;
        }>>]>;
    }>>, rt.ExactC<rt.PartialC<{
        /**
         * description of template
         */
        description: rt.StringC;
        /**
         * tags of template
         */
        tags: rt.ArrayC<rt.StringC>;
    }>>]>>;
    /**
     * Observable types configured for the case
     */
    observableTypes: rt.ArrayC<rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
    }>>>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * The plugin owner that manages this configuration
     */
    owner: rt.StringC;
}>>]>;
export declare const ConfigurationActivityFieldsRt: rt.ExactC<rt.TypeC<{
    created_at: rt.StringC;
    created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>;
    updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>, rt.NullC]>;
}>>;
export declare const ConfigurationAttributesRt: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * The external connector
     */
    connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
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
     * The custom fields configured for the case
     */
    customFields: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>]>]>>;
    /**
     * Templates configured for the case
     */
    templates: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        /**
         * key of template
         */
        key: rt.StringC;
        /**
         * name of template
         */
        name: rt.StringC;
        /**
         * case fields of template
         */
        caseFields: rt.UnionC<[rt.NullC, rt.ExactC<rt.PartialC<{
            description: rt.StringC;
            tags: rt.ArrayC<rt.StringC>;
            title: rt.StringC;
            connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
            }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>]>]>;
            severity: rt.UnionC<[rt.LiteralC<import("../case/v1").CaseSeverity.LOW>, rt.LiteralC<import("../case/v1").CaseSeverity.MEDIUM>, rt.LiteralC<import("../case/v1").CaseSeverity.HIGH>, rt.LiteralC<import("../case/v1").CaseSeverity.CRITICAL>]>;
            assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
                uid: rt.StringC;
            }>>>;
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
                value: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
                value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>]>>;
            settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                syncAlerts: rt.BooleanC;
            }>>, rt.ExactC<rt.PartialC<{
                extractObservables: rt.BooleanC;
            }>>]>;
            observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
                createdAt: rt.StringC;
                updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                typeKey: rt.StringC;
                value: rt.StringC;
                description: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>>;
        }>>]>;
    }>>, rt.ExactC<rt.PartialC<{
        /**
         * description of template
         */
        description: rt.StringC;
        /**
         * tags of template
         */
        tags: rt.ArrayC<rt.StringC>;
    }>>]>>;
    /**
     * Observable types configured for the case
     */
    observableTypes: rt.ArrayC<rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
    }>>>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * The plugin owner that manages this configuration
     */
    owner: rt.StringC;
}>>]>, rt.ExactC<rt.TypeC<{
    created_at: rt.StringC;
    created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>;
    updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>, rt.NullC]>;
}>>]>;
export declare const ConfigurationRt: rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * The external connector
     */
    connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
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
     * The custom fields configured for the case
     */
    customFields: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>]>]>>;
    /**
     * Templates configured for the case
     */
    templates: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        /**
         * key of template
         */
        key: rt.StringC;
        /**
         * name of template
         */
        name: rt.StringC;
        /**
         * case fields of template
         */
        caseFields: rt.UnionC<[rt.NullC, rt.ExactC<rt.PartialC<{
            description: rt.StringC;
            tags: rt.ArrayC<rt.StringC>;
            title: rt.StringC;
            connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
            }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>]>]>;
            severity: rt.UnionC<[rt.LiteralC<import("../case/v1").CaseSeverity.LOW>, rt.LiteralC<import("../case/v1").CaseSeverity.MEDIUM>, rt.LiteralC<import("../case/v1").CaseSeverity.HIGH>, rt.LiteralC<import("../case/v1").CaseSeverity.CRITICAL>]>;
            assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
                uid: rt.StringC;
            }>>>;
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
                value: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
                value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>]>>;
            settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                syncAlerts: rt.BooleanC;
            }>>, rt.ExactC<rt.PartialC<{
                extractObservables: rt.BooleanC;
            }>>]>;
            observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
                createdAt: rt.StringC;
                updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                typeKey: rt.StringC;
                value: rt.StringC;
                description: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>>;
        }>>]>;
    }>>, rt.ExactC<rt.PartialC<{
        /**
         * description of template
         */
        description: rt.StringC;
        /**
         * tags of template
         */
        tags: rt.ArrayC<rt.StringC>;
    }>>]>>;
    /**
     * Observable types configured for the case
     */
    observableTypes: rt.ArrayC<rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
    }>>>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * The plugin owner that manages this configuration
     */
    owner: rt.StringC;
}>>]>, rt.ExactC<rt.TypeC<{
    created_at: rt.StringC;
    created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>;
    updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>, rt.NullC]>;
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
    error: rt.UnionC<[rt.StringC, rt.NullC]>;
    owner: rt.StringC;
    mappings: rt.ArrayC<rt.ExactC<rt.TypeC<{
        action_type: rt.UnionC<[rt.LiteralC<"append">, rt.LiteralC<"nothing">, rt.LiteralC<"overwrite">]>;
        source: rt.UnionC<[rt.LiteralC<"title">, rt.LiteralC<"description">, rt.LiteralC<"comments">, rt.LiteralC<"tags">]>;
        target: rt.UnionC<[rt.StringC, rt.LiteralC<"not_mapped">]>;
    }>>>;
}>>]>;
export declare const ConfigurationsRt: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * The external connector
     */
    connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
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
     * The custom fields configured for the case
     */
    customFields: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
    }>>, rt.ExactC<rt.TypeC<{
        /**
         * key of custom field
         */
        key: rt.StringC;
        /**
         * label of custom field
         */
        label: rt.StringC;
        /**
         * custom field options - required
         */
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>]>]>>;
    /**
     * Templates configured for the case
     */
    templates: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        /**
         * key of template
         */
        key: rt.StringC;
        /**
         * name of template
         */
        name: rt.StringC;
        /**
         * case fields of template
         */
        caseFields: rt.UnionC<[rt.NullC, rt.ExactC<rt.PartialC<{
            description: rt.StringC;
            tags: rt.ArrayC<rt.StringC>;
            title: rt.StringC;
            connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
            }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.casesWebhook>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.jira>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.none>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.resilient>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
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
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.swimlane>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../connector/v1").ConnectorTypes.theHive>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>]>]>;
            severity: rt.UnionC<[rt.LiteralC<import("../case/v1").CaseSeverity.LOW>, rt.LiteralC<import("../case/v1").CaseSeverity.MEDIUM>, rt.LiteralC<import("../case/v1").CaseSeverity.HIGH>, rt.LiteralC<import("../case/v1").CaseSeverity.CRITICAL>]>;
            assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
                uid: rt.StringC;
            }>>>;
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TEXT>;
                value: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.TOGGLE>;
                value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../custom_field/v1").CustomFieldTypes.NUMBER>;
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>]>>;
            settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                syncAlerts: rt.BooleanC;
            }>>, rt.ExactC<rt.PartialC<{
                extractObservables: rt.BooleanC;
            }>>]>;
            observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
                createdAt: rt.StringC;
                updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                typeKey: rt.StringC;
                value: rt.StringC;
                description: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>>;
        }>>]>;
    }>>, rt.ExactC<rt.PartialC<{
        /**
         * description of template
         */
        description: rt.StringC;
        /**
         * tags of template
         */
        tags: rt.ArrayC<rt.StringC>;
    }>>]>>;
    /**
     * Observable types configured for the case
     */
    observableTypes: rt.ArrayC<rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
    }>>>;
}>>, rt.ExactC<rt.TypeC<{
    /**
     * The plugin owner that manages this configuration
     */
    owner: rt.StringC;
}>>]>, rt.ExactC<rt.TypeC<{
    created_at: rt.StringC;
    created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>;
    updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>, rt.NullC]>;
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
    error: rt.UnionC<[rt.StringC, rt.NullC]>;
    owner: rt.StringC;
    mappings: rt.ArrayC<rt.ExactC<rt.TypeC<{
        action_type: rt.UnionC<[rt.LiteralC<"append">, rt.LiteralC<"nothing">, rt.LiteralC<"overwrite">]>;
        source: rt.UnionC<[rt.LiteralC<"title">, rt.LiteralC<"description">, rt.LiteralC<"comments">, rt.LiteralC<"tags">]>;
        target: rt.UnionC<[rt.StringC, rt.LiteralC<"not_mapped">]>;
    }>>>;
}>>]>>;
export type CustomFieldsConfiguration = rt.TypeOf<typeof CustomFieldsConfigurationRt>;
export type CustomFieldConfiguration = rt.TypeOf<typeof CustomFieldConfigurationRt>;
export type TemplatesConfiguration = rt.TypeOf<typeof TemplatesConfigurationRt>;
export type TemplateConfiguration = rt.TypeOf<typeof TemplateConfigurationRt>;
export type ClosureType = rt.TypeOf<typeof ClosureTypeRt>;
export type ConfigurationAttributes = rt.TypeOf<typeof ConfigurationAttributesRt>;
export type Configuration = rt.TypeOf<typeof ConfigurationRt>;
export type Configurations = rt.TypeOf<typeof ConfigurationsRt>;
export type ObservableTypesConfiguration = rt.TypeOf<typeof ObservableTypesConfigurationRt>;
export type ObservableTypeConfiguration = rt.TypeOf<typeof CaseObservableTypeRt>;
