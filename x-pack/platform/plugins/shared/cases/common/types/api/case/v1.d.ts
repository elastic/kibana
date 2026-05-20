import * as rt from 'io-ts';
declare const CustomFieldRt: rt.UnionC<[rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<import("../../domain").CustomFieldTypes.TEXT>;
    value: rt.UnionC<[rt.Type<string, string, unknown>, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<import("../../domain").CustomFieldTypes.TOGGLE>;
    value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    type: rt.LiteralC<import("../../domain").CustomFieldTypes.NUMBER>;
    value: rt.UnionC<[rt.Type<number, number, unknown>, rt.NullC]>;
}>>]>;
export declare const CaseRequestCustomFieldsRt: rt.Type<({
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
export declare const CaseBaseOptionalFieldsRequestRt: rt.ExactC<rt.PartialC<{
    /**
     * The description of the case
     */
    description: rt.Type<string, string, unknown>;
    /**
     * The identifying strings for filter a case
     */
    tags: rt.Type<string[], string[], unknown>;
    /**
     * The title of a case
     */
    title: rt.Type<string, string, unknown>;
    /**
     * The external system that the case can be synced with
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
     * The severity of the case
     */
    severity: rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>;
    /**
     * The users assigned to this case
     */
    assignees: rt.Type<{
        uid: string;
    }[], {
        uid: string;
    }[], unknown>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.Type<string, string, unknown>, rt.NullC]>;
    /**
     * Custom fields of the case
     */
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
    /**
     * The alert sync settings
     */
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
    /**
     * The close reason to sync to attached alerts
     */
    closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
}>>;
export declare const CaseRequestFieldsRt: rt.IntersectionC<[rt.ExactC<rt.PartialC<{
    /**
     * The description of the case
     */
    description: rt.Type<string, string, unknown>;
    /**
     * The identifying strings for filter a case
     */
    tags: rt.Type<string[], string[], unknown>;
    /**
     * The title of a case
     */
    title: rt.Type<string, string, unknown>;
    /**
     * The external system that the case can be synced with
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
     * The severity of the case
     */
    severity: rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>;
    /**
     * The users assigned to this case
     */
    assignees: rt.Type<{
        uid: string;
    }[], {
        uid: string;
    }[], unknown>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.Type<string, string, unknown>, rt.NullC]>;
    /**
     * Custom fields of the case
     */
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
    /**
     * The alert sync settings
     */
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
    /**
     * The close reason to sync to attached alerts
     */
    closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
}>>, rt.ExactC<rt.PartialC<{
    /**
     * The current status of the case (open, closed, in-progress)
     */
    status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
    /**
     * The plugin owner of the case
     */
    owner: rt.StringC;
}>>]>;
/**
 * Create case
 */
export declare const CasePostRequestRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * Description of the case
     */
    description: rt.Type<string, string, unknown>;
    /**
     * Identifiers for the case.
     */
    tags: rt.Type<string[], string[], unknown>;
    /**
     * Title of the case
     */
    title: rt.Type<string, string, unknown>;
    /**
     * The external configuration for the case
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
     * Sync settings for alerts
     */
    settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        syncAlerts: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        extractObservables: rt.BooleanC;
    }>>]>;
    /**
     * The owner here must match the string used when a plugin registers a feature with access to the cases plugin. The user
     * creating this case must also be granted access to that plugin's feature.
     */
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    /**
     * The users assigned to the case
     */
    assignees: rt.Type<{
        uid: string;
    }[], {
        uid: string;
    }[], unknown>;
    /**
     * The severity of the case. The severity is
     * default it to "low" if not provided.
     */
    severity: rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.Type<string, string, unknown>, rt.NullC]>;
    /**
     * The list of custom field values of the case.
     */
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
    template: rt.UnionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        version: rt.NumberC;
    }>>, rt.NullC]>;
    extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
}>>]>;
export declare const BulkCreateCasesRequestRt: rt.ExactC<rt.TypeC<{
    cases: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        /**
         * Description of the case
         */
        description: rt.Type<string, string, unknown>;
        /**
         * Identifiers for the case.
         */
        tags: rt.Type<string[], string[], unknown>;
        /**
         * Title of the case
         */
        title: rt.Type<string, string, unknown>;
        /**
         * The external configuration for the case
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
         * Sync settings for alerts
         */
        settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            syncAlerts: rt.BooleanC;
        }>>, rt.ExactC<rt.PartialC<{
            extractObservables: rt.BooleanC;
        }>>]>;
        /**
         * The owner here must match the string used when a plugin registers a feature with access to the cases plugin. The user
         * creating this case must also be granted access to that plugin's feature.
         */
        owner: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        /**
         * The users assigned to the case
         */
        assignees: rt.Type<{
            uid: string;
        }[], {
            uid: string;
        }[], unknown>;
        /**
         * The severity of the case. The severity is
         * default it to "low" if not provided.
         */
        severity: rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>;
        /**
         * The category of the case.
         */
        category: rt.UnionC<[rt.Type<string, string, unknown>, rt.NullC]>;
        /**
         * The list of custom field values of the case.
         */
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
        template: rt.UnionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.NumberC;
        }>>, rt.NullC]>;
        extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
    }>>]>, rt.ExactC<rt.PartialC<{
        id: rt.StringC;
    }>>]>>;
}>>;
export declare const BulkCreateCasesResponseRt: rt.ExactC<rt.TypeC<{
    cases: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        description: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
        title: rt.StringC;
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
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
        customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.NUMBER>;
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
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        duration: rt.UnionC<[rt.NumberC, rt.NullC]>;
        closed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        closed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        external_service: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            connector_id: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            connector_name: rt.StringC;
            external_id: rt.StringC;
            external_title: rt.StringC;
            external_url: rt.StringC;
            pushed_at: rt.StringC;
            pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        total_observables: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        incremental_id: rt.UnionC<[rt.NumberC, rt.NullC]>;
        in_progress_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        time_to_acknowledge: rt.UnionC<[rt.NumberC, rt.NullC]>;
        time_to_investigate: rt.UnionC<[rt.NumberC, rt.NullC]>;
        time_to_resolve: rt.UnionC<[rt.NumberC, rt.NullC]>;
        template: rt.UnionC<[rt.NullC, rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.NumberC;
        }>>]>;
        extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
    }>>]>, rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        totalComment: rt.NumberC;
        totalAlerts: rt.NumberC;
        totalEvents: rt.UnionC<[rt.NumberC, rt.UndefinedC]>;
        version: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        comments: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            comment: rt.StringC;
            type: rt.LiteralC<import("../../domain").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.actions>;
            comment: rt.StringC;
            actions: rt.ExactC<rt.TypeC<{
                targets: rt.ArrayC<rt.ExactC<rt.TypeC<{
                    hostname: rt.StringC;
                    endpointId: rt.StringC;
                }>>>;
                type: rt.StringC;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.elasticSearchDoc>;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.savedObject>;
                soType: rt.StringC;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
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
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.persistableState>;
            owner: rt.StringC;
            persistableStateAttachmentTypeId: rt.StringC;
            persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>]>, rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.StringC;
            attachmentId: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.PartialC<{
            data: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.StringC;
            data: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.PartialC<{
            metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>]>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
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
        }>>]>]>>;
        extended_fields_labels: rt.RecordC<rt.StringC, rt.StringC>;
    }>>]>>;
}>>;
/**
 * Find cases
 */
export declare const CasesFindRequestSearchFieldsRt: rt.KeyofC<{
    description: null;
    title: null;
    'incremental_id.text': null;
}>;
export declare const CasesFindRequestSortFieldsRt: rt.KeyofC<{
    title: null;
    category: null;
    createdAt: null;
    updatedAt: null;
    closedAt: null;
    status: null;
    severity: null;
}>;
export declare const CasesFindRequestBaseFieldsRt: rt.IntersectionC<[rt.ExactC<rt.PartialC<{
    /**
     * Tags to filter by
     */
    tags: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * The status of the case (open, closed, in-progress)
     */
    status: rt.UnionC<[rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>, rt.ArrayC<rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>>]>;
    /**
     * The severity of the case
     */
    severity: rt.UnionC<[rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>, rt.ArrayC<rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>>]>;
    /**
     * The uids of the user profiles to filter by
     */
    assignees: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * The reporters to filter by
     */
    reporters: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * Operator to use for the `search` field
     */
    defaultSearchOperator: rt.UnionC<[rt.LiteralC<"AND">, rt.LiteralC<"OR">]>;
    /**
     * A KQL date. If used all cases created after (gte) the from date will be returned
     */
    from: rt.StringC;
    /**
     * The page of objects to return
     */
    /**
     * The number of objects to include in each page
     */
    /**
     * An Elasticsearch simple_query_string
     */
    search: rt.StringC;
    /**
     * The field to use for sorting the found objects.
     *
     */
    sortField: rt.KeyofC<{
        title: null;
        category: null;
        createdAt: null;
        updatedAt: null;
        closedAt: null;
        status: null;
        severity: null;
    }>;
    /**
     * The order to sort by
     */
    sortOrder: rt.UnionC<[rt.LiteralC<"desc">, rt.LiteralC<"asc">]>;
    /**
     * A KQL date. If used all cases created before (lte) the to date will be returned.
     */
    to: rt.StringC;
    /**
     * The owner(s) to filter by. The user making the request must have privileges to retrieve cases of that
     * ownership or they will be ignored. If no owner is included, then all ownership types will be included in the response
     * that the user has access to.
     */
    owner: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
}>>, rt.PartialType<undefined, Partial<import("../../../schema/types").Pagination>, Partial<import("../../../schema/types").Pagination>, unknown>]>;
export declare const CasesFindRequestRt: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.PartialC<{
    /**
     * Tags to filter by
     */
    tags: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * The status of the case (open, closed, in-progress)
     */
    status: rt.UnionC<[rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>, rt.ArrayC<rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>>]>;
    /**
     * The severity of the case
     */
    severity: rt.UnionC<[rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>, rt.ArrayC<rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>>]>;
    /**
     * The uids of the user profiles to filter by
     */
    assignees: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * The reporters to filter by
     */
    reporters: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * Operator to use for the `search` field
     */
    defaultSearchOperator: rt.UnionC<[rt.LiteralC<"AND">, rt.LiteralC<"OR">]>;
    /**
     * A KQL date. If used all cases created after (gte) the from date will be returned
     */
    from: rt.StringC;
    /**
     * The page of objects to return
     */
    /**
     * The number of objects to include in each page
     */
    /**
     * An Elasticsearch simple_query_string
     */
    search: rt.StringC;
    /**
     * The field to use for sorting the found objects.
     *
     */
    sortField: rt.KeyofC<{
        title: null;
        category: null;
        createdAt: null;
        updatedAt: null;
        closedAt: null;
        status: null;
        severity: null;
    }>;
    /**
     * The order to sort by
     */
    sortOrder: rt.UnionC<[rt.LiteralC<"desc">, rt.LiteralC<"asc">]>;
    /**
     * A KQL date. If used all cases created before (lte) the to date will be returned.
     */
    to: rt.StringC;
    /**
     * The owner(s) to filter by. The user making the request must have privileges to retrieve cases of that
     * ownership or they will be ignored. If no owner is included, then all ownership types will be included in the response
     * that the user has access to.
     */
    owner: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
}>>, rt.PartialType<undefined, Partial<import("../../../schema/types").Pagination>, Partial<import("../../../schema/types").Pagination>, unknown>]>, rt.ExactC<rt.PartialC<{
    /**
     * The fields to perform the simple_query_string parsed query against
     */
    searchFields: rt.UnionC<[rt.ArrayC<rt.KeyofC<{
        description: null;
        title: null;
        'incremental_id.text': null;
    }>>, rt.KeyofC<{
        description: null;
        title: null;
        'incremental_id.text': null;
    }>]>;
}>>]>;
export declare const CasesFindRequestWithCustomFieldsRt: rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.PartialC<{
    /**
     * Tags to filter by
     */
    tags: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * The status of the case (open, closed, in-progress)
     */
    status: rt.UnionC<[rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>, rt.ArrayC<rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>>]>;
    /**
     * The severity of the case
     */
    severity: rt.UnionC<[rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>, rt.ArrayC<rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>>]>;
    /**
     * The uids of the user profiles to filter by
     */
    assignees: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * The reporters to filter by
     */
    reporters: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * Operator to use for the `search` field
     */
    defaultSearchOperator: rt.UnionC<[rt.LiteralC<"AND">, rt.LiteralC<"OR">]>;
    /**
     * A KQL date. If used all cases created after (gte) the from date will be returned
     */
    from: rt.StringC;
    /**
     * The page of objects to return
     */
    /**
     * The number of objects to include in each page
     */
    /**
     * An Elasticsearch simple_query_string
     */
    search: rt.StringC;
    /**
     * The field to use for sorting the found objects.
     *
     */
    sortField: rt.KeyofC<{
        title: null;
        category: null;
        createdAt: null;
        updatedAt: null;
        closedAt: null;
        status: null;
        severity: null;
    }>;
    /**
     * The order to sort by
     */
    sortOrder: rt.UnionC<[rt.LiteralC<"desc">, rt.LiteralC<"asc">]>;
    /**
     * A KQL date. If used all cases created before (lte) the to date will be returned.
     */
    to: rt.StringC;
    /**
     * The owner(s) to filter by. The user making the request must have privileges to retrieve cases of that
     * ownership or they will be ignored. If no owner is included, then all ownership types will be included in the response
     * that the user has access to.
     */
    owner: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
}>>, rt.PartialType<undefined, Partial<import("../../../schema/types").Pagination>, Partial<import("../../../schema/types").Pagination>, unknown>]>, rt.ExactC<rt.PartialC<{
    /**
     * The fields to perform the simple_query_string parsed query against
     */
    searchFields: rt.UnionC<[rt.ArrayC<rt.KeyofC<{
        description: null;
        title: null;
        'incremental_id.text': null;
    }>>, rt.KeyofC<{
        description: null;
        title: null;
        'incremental_id.text': null;
    }>]>;
}>>]>, rt.ExactC<rt.PartialC<{
    /**
     * custom fields of the case
     */
    customFields: rt.RecordC<rt.StringC, rt.ArrayC<rt.UnionC<[rt.StringC, rt.BooleanC, rt.NumberC, rt.NullC]>>>;
}>>]>;
/**
 * search cases
 */
export declare const CasesSearchRequestSearchFieldsRt: rt.KeyofC<{
    'cases.description': null;
    'cases.title': null;
    'cases.incremental_id.text': null;
    'cases.observables.value': null;
    'cases.customFields.value': null;
    'cases-comments.comment': null;
    'cases-comments.alertId': null;
    'cases-comments.eventId': null;
    'cases.ef_all_values': null;
}>;
export declare const CasesSearchRequestRt: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.PartialC<{
    /**
     * Tags to filter by
     */
    tags: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * The status of the case (open, closed, in-progress)
     */
    status: rt.UnionC<[rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>, rt.ArrayC<rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>>]>;
    /**
     * The severity of the case
     */
    severity: rt.UnionC<[rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>, rt.ArrayC<rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>>]>;
    /**
     * The uids of the user profiles to filter by
     */
    assignees: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * The reporters to filter by
     */
    reporters: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
    /**
     * Operator to use for the `search` field
     */
    defaultSearchOperator: rt.UnionC<[rt.LiteralC<"AND">, rt.LiteralC<"OR">]>;
    /**
     * A KQL date. If used all cases created after (gte) the from date will be returned
     */
    from: rt.StringC;
    /**
     * The page of objects to return
     */
    /**
     * The number of objects to include in each page
     */
    /**
     * An Elasticsearch simple_query_string
     */
    search: rt.StringC;
    /**
     * The field to use for sorting the found objects.
     *
     */
    sortField: rt.KeyofC<{
        title: null;
        category: null;
        createdAt: null;
        updatedAt: null;
        closedAt: null;
        status: null;
        severity: null;
    }>;
    /**
     * The order to sort by
     */
    sortOrder: rt.UnionC<[rt.LiteralC<"desc">, rt.LiteralC<"asc">]>;
    /**
     * A KQL date. If used all cases created before (lte) the to date will be returned.
     */
    to: rt.StringC;
    /**
     * The owner(s) to filter by. The user making the request must have privileges to retrieve cases of that
     * ownership or they will be ignored. If no owner is included, then all ownership types will be included in the response
     * that the user has access to.
     */
    owner: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.Type<string[], string[], unknown>, rt.StringC]>;
}>>, rt.PartialType<undefined, Partial<import("../../../schema/types").Pagination>, Partial<import("../../../schema/types").Pagination>, unknown>]>, rt.ExactC<rt.PartialC<{
    /**
     * custom fields of the case
     */
    customFields: rt.RecordC<rt.StringC, rt.ArrayC<rt.UnionC<[rt.StringC, rt.BooleanC, rt.NumberC, rt.NullC]>>>;
}>>, rt.ExactC<rt.PartialC<{
    /**
     * The fields to perform the simple_query_string parsed query against.
     */
    searchFields: rt.UnionC<[rt.ArrayC<rt.KeyofC<{
        'cases.description': null;
        'cases.title': null;
        'cases.incremental_id.text': null;
        'cases.observables.value': null;
        'cases.customFields.value': null;
        'cases-comments.comment': null;
        'cases-comments.alertId': null;
        'cases-comments.eventId': null;
        'cases.ef_all_values': null;
    }>>, rt.KeyofC<{
        'cases.description': null;
        'cases.title': null;
        'cases.incremental_id.text': null;
        'cases.observables.value': null;
        'cases.customFields.value': null;
        'cases-comments.comment': null;
        'cases-comments.alertId': null;
        'cases-comments.eventId': null;
        'cases.ef_all_values': null;
    }>]>;
}>>, rt.ExactC<rt.PartialC<{
    /**
     * Extended field filters parsed from label:value syntax in the search bar.
     */
    extendedFieldFilters: rt.ArrayC<rt.ExactC<rt.TypeC<{
        label: rt.StringC;
        value: rt.StringC;
    }>>>;
}>>]>;
export declare const CasesFindResponseRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    cases: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        description: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
        title: rt.StringC;
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
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
        customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.NUMBER>;
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
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        duration: rt.UnionC<[rt.NumberC, rt.NullC]>;
        closed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        closed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        external_service: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            connector_id: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            connector_name: rt.StringC;
            external_id: rt.StringC;
            external_title: rt.StringC;
            external_url: rt.StringC;
            pushed_at: rt.StringC;
            pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        total_observables: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        incremental_id: rt.UnionC<[rt.NumberC, rt.NullC]>;
        in_progress_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        time_to_acknowledge: rt.UnionC<[rt.NumberC, rt.NullC]>;
        time_to_investigate: rt.UnionC<[rt.NumberC, rt.NullC]>;
        time_to_resolve: rt.UnionC<[rt.NumberC, rt.NullC]>;
        template: rt.UnionC<[rt.NullC, rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.NumberC;
        }>>]>;
        extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
    }>>]>, rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        totalComment: rt.NumberC;
        totalAlerts: rt.NumberC;
        totalEvents: rt.UnionC<[rt.NumberC, rt.UndefinedC]>;
        version: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        comments: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            comment: rt.StringC;
            type: rt.LiteralC<import("../../domain").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.actions>;
            comment: rt.StringC;
            actions: rt.ExactC<rt.TypeC<{
                targets: rt.ArrayC<rt.ExactC<rt.TypeC<{
                    hostname: rt.StringC;
                    endpointId: rt.StringC;
                }>>>;
                type: rt.StringC;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.elasticSearchDoc>;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.savedObject>;
                soType: rt.StringC;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
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
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.persistableState>;
            owner: rt.StringC;
            persistableStateAttachmentTypeId: rt.StringC;
            persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>]>, rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.StringC;
            attachmentId: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.PartialC<{
            data: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.StringC;
            data: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.PartialC<{
            metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>]>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
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
        }>>]>]>>;
        extended_fields_labels: rt.RecordC<rt.StringC, rt.StringC>;
    }>>]>>;
    page: rt.NumberC;
    per_page: rt.NumberC;
    total: rt.NumberC;
}>>, rt.ExactC<rt.TypeC<{
    count_open_cases: rt.NumberC;
    count_in_progress_cases: rt.NumberC;
    count_closed_cases: rt.NumberC;
}>>]>;
export declare const CasesSimilarResponseRt: rt.ExactC<rt.TypeC<{
    cases: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        description: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
        title: rt.StringC;
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
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
        customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.NUMBER>;
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
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        duration: rt.UnionC<[rt.NumberC, rt.NullC]>;
        closed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        closed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        external_service: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            connector_id: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            connector_name: rt.StringC;
            external_id: rt.StringC;
            external_title: rt.StringC;
            external_url: rt.StringC;
            pushed_at: rt.StringC;
            pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        total_observables: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        incremental_id: rt.UnionC<[rt.NumberC, rt.NullC]>;
        in_progress_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        time_to_acknowledge: rt.UnionC<[rt.NumberC, rt.NullC]>;
        time_to_investigate: rt.UnionC<[rt.NumberC, rt.NullC]>;
        time_to_resolve: rt.UnionC<[rt.NumberC, rt.NullC]>;
        template: rt.UnionC<[rt.NullC, rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.NumberC;
        }>>]>;
        extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
    }>>]>, rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        totalComment: rt.NumberC;
        totalAlerts: rt.NumberC;
        totalEvents: rt.UnionC<[rt.NumberC, rt.UndefinedC]>;
        version: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        comments: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            comment: rt.StringC;
            type: rt.LiteralC<import("../../domain").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.actions>;
            comment: rt.StringC;
            actions: rt.ExactC<rt.TypeC<{
                targets: rt.ArrayC<rt.ExactC<rt.TypeC<{
                    hostname: rt.StringC;
                    endpointId: rt.StringC;
                }>>>;
                type: rt.StringC;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.elasticSearchDoc>;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.savedObject>;
                soType: rt.StringC;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
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
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.persistableState>;
            owner: rt.StringC;
            persistableStateAttachmentTypeId: rt.StringC;
            persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>]>, rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.StringC;
            attachmentId: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.PartialC<{
            data: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.StringC;
            data: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.PartialC<{
            metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>]>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
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
        }>>]>]>>;
        extended_fields_labels: rt.RecordC<rt.StringC, rt.StringC>;
    }>>]>, rt.ExactC<rt.TypeC<{
        similarities: rt.ExactC<rt.TypeC<{
            observables: rt.ArrayC<rt.ExactC<rt.TypeC<{
                typeKey: rt.StringC;
                typeLabel: rt.StringC;
                value: rt.StringC;
            }>>>;
        }>>;
    }>>]>>;
    page: rt.NumberC;
    per_page: rt.NumberC;
    total: rt.NumberC;
}>>;
/**
 * Delete cases
 */
export declare const CasesDeleteRequestRt: rt.Type<string[], string[], unknown>;
/**
 * Resolve case
 */
export declare const CaseResolveResponseRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    case: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        description: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
        title: rt.StringC;
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
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
        customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.NUMBER>;
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
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        duration: rt.UnionC<[rt.NumberC, rt.NullC]>;
        closed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        closed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        external_service: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            connector_id: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            connector_name: rt.StringC;
            external_id: rt.StringC;
            external_title: rt.StringC;
            external_url: rt.StringC;
            pushed_at: rt.StringC;
            pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        total_observables: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        incremental_id: rt.UnionC<[rt.NumberC, rt.NullC]>;
        in_progress_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        time_to_acknowledge: rt.UnionC<[rt.NumberC, rt.NullC]>;
        time_to_investigate: rt.UnionC<[rt.NumberC, rt.NullC]>;
        time_to_resolve: rt.UnionC<[rt.NumberC, rt.NullC]>;
        template: rt.UnionC<[rt.NullC, rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.NumberC;
        }>>]>;
        extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
    }>>]>, rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        totalComment: rt.NumberC;
        totalAlerts: rt.NumberC;
        totalEvents: rt.UnionC<[rt.NumberC, rt.UndefinedC]>;
        version: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        comments: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            comment: rt.StringC;
            type: rt.LiteralC<import("../../domain").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.actions>;
            comment: rt.StringC;
            actions: rt.ExactC<rt.TypeC<{
                targets: rt.ArrayC<rt.ExactC<rt.TypeC<{
                    hostname: rt.StringC;
                    endpointId: rt.StringC;
                }>>>;
                type: rt.StringC;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.elasticSearchDoc>;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.savedObject>;
                soType: rt.StringC;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
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
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.persistableState>;
            owner: rt.StringC;
            persistableStateAttachmentTypeId: rt.StringC;
            persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>]>, rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.StringC;
            attachmentId: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.PartialC<{
            data: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.StringC;
            data: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.PartialC<{
            metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>]>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
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
        }>>]>]>>;
        extended_fields_labels: rt.RecordC<rt.StringC, rt.StringC>;
    }>>]>;
    outcome: rt.UnionC<[rt.LiteralC<"exactMatch">, rt.LiteralC<"aliasMatch">, rt.LiteralC<"conflict">]>;
}>>, rt.ExactC<rt.PartialC<{
    alias_target_id: rt.StringC;
    alias_purpose: rt.UnionC<[rt.LiteralC<"savedObjectConversion">, rt.LiteralC<"savedObjectImport">]>;
}>>]>;
/**
 * Get cases
 */
export declare const CasesBulkGetRequestRt: rt.ExactC<rt.TypeC<{
    ids: rt.Type<string[], string[], unknown>;
}>>;
export declare const CasesBulkGetResponseRt: rt.ExactC<rt.TypeC<{
    cases: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        description: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
        title: rt.StringC;
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
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
        customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../../domain").CustomFieldTypes.NUMBER>;
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
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        duration: rt.UnionC<[rt.NumberC, rt.NullC]>;
        closed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        closed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        external_service: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            connector_id: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            connector_name: rt.StringC;
            external_id: rt.StringC;
            external_title: rt.StringC;
            external_url: rt.StringC;
            pushed_at: rt.StringC;
            pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        total_observables: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        incremental_id: rt.UnionC<[rt.NumberC, rt.NullC]>;
        in_progress_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        time_to_acknowledge: rt.UnionC<[rt.NumberC, rt.NullC]>;
        time_to_investigate: rt.UnionC<[rt.NumberC, rt.NullC]>;
        time_to_resolve: rt.UnionC<[rt.NumberC, rt.NullC]>;
        template: rt.UnionC<[rt.NullC, rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.NumberC;
        }>>]>;
        extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
    }>>]>, rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        totalComment: rt.NumberC;
        totalAlerts: rt.NumberC;
        totalEvents: rt.UnionC<[rt.NumberC, rt.UndefinedC]>;
        version: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        comments: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            comment: rt.StringC;
            type: rt.LiteralC<import("../../domain").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.actions>;
            comment: rt.StringC;
            actions: rt.ExactC<rt.TypeC<{
                targets: rt.ArrayC<rt.ExactC<rt.TypeC<{
                    hostname: rt.StringC;
                    endpointId: rt.StringC;
                }>>>;
                type: rt.StringC;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.elasticSearchDoc>;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.savedObject>;
                soType: rt.StringC;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
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
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.persistableState>;
            owner: rt.StringC;
            persistableStateAttachmentTypeId: rt.StringC;
            persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        }>>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
            updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
        }>>]>]>, rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.StringC;
            attachmentId: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.PartialC<{
            data: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.StringC;
            data: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.PartialC<{
            metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>]>, rt.ExactC<rt.TypeC<{
            created_at: rt.StringC;
            created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>;
            owner: rt.StringC;
            pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
            pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            }>>, rt.ExactC<rt.PartialC<{
                profile_uid: rt.StringC;
            }>>]>, rt.NullC]>;
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
        }>>]>]>>;
        extended_fields_labels: rt.RecordC<rt.StringC, rt.StringC>;
    }>>]>>;
    errors: rt.ArrayC<rt.ExactC<rt.TypeC<{
        error: rt.StringC;
        message: rt.StringC;
        status: rt.UnionC<[rt.UndefinedC, rt.NumberC]>;
        caseId: rt.StringC;
    }>>>;
}>>;
/**
 * Update cases
 */
export declare const CasePatchRequestRt: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.PartialC<{
    /**
     * The description of the case
     */
    description: rt.Type<string, string, unknown>;
    /**
     * The identifying strings for filter a case
     */
    tags: rt.Type<string[], string[], unknown>;
    /**
     * The title of a case
     */
    title: rt.Type<string, string, unknown>;
    /**
     * The external system that the case can be synced with
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
     * The severity of the case
     */
    severity: rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>;
    /**
     * The users assigned to this case
     */
    assignees: rt.Type<{
        uid: string;
    }[], {
        uid: string;
    }[], unknown>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.Type<string, string, unknown>, rt.NullC]>;
    /**
     * Custom fields of the case
     */
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
    /**
     * The alert sync settings
     */
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
    /**
     * The close reason to sync to attached alerts
     */
    closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
}>>, rt.ExactC<rt.PartialC<{
    /**
     * The current status of the case (open, closed, in-progress)
     */
    status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
    /**
     * The plugin owner of the case
     */
    owner: rt.StringC;
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
}>>]>;
export declare const CasesPatchRequestRt: rt.ExactC<rt.TypeC<{
    cases: rt.Type<({
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
    } & {
        status?: import("@kbn/cases-components/src/status/types").CaseStatuses | undefined;
        owner?: string | undefined;
    } & {
        id: string;
        version: string;
    })[], ({
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
    } & {
        status?: import("@kbn/cases-components/src/status/types").CaseStatuses | undefined;
        owner?: string | undefined;
    } & {
        id: string;
        version: string;
    })[], unknown>;
}>>;
export declare const UpdateSummaryRt: rt.ExactC<rt.TypeC<{
    syncedAlertCount: rt.NumberC;
}>>;
export declare const CaseWithUpdateSummaryRt: rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    description: rt.StringC;
    tags: rt.ArrayC<rt.StringC>;
    title: rt.StringC;
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
    assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
        uid: rt.StringC;
    }>>>;
    category: rt.UnionC<[rt.StringC, rt.NullC]>;
    customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        type: rt.LiteralC<import("../../domain").CustomFieldTypes.TEXT>;
        value: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        type: rt.LiteralC<import("../../domain").CustomFieldTypes.TOGGLE>;
        value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        type: rt.LiteralC<import("../../domain").CustomFieldTypes.NUMBER>;
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
    status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    duration: rt.UnionC<[rt.NumberC, rt.NullC]>;
    closed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    closed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>, rt.NullC]>;
    created_at: rt.StringC;
    created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>;
    external_service: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        connector_id: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        connector_name: rt.StringC;
        external_id: rt.StringC;
        external_title: rt.StringC;
        external_url: rt.StringC;
        pushed_at: rt.StringC;
        pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
    }>>]>, rt.NullC]>;
    updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>, rt.NullC]>;
    total_observables: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>>, rt.ExactC<rt.PartialC<{
    incremental_id: rt.UnionC<[rt.NumberC, rt.NullC]>;
    in_progress_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    time_to_acknowledge: rt.UnionC<[rt.NumberC, rt.NullC]>;
    time_to_investigate: rt.UnionC<[rt.NumberC, rt.NullC]>;
    time_to_resolve: rt.UnionC<[rt.NumberC, rt.NullC]>;
    template: rt.UnionC<[rt.NullC, rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        version: rt.NumberC;
    }>>]>;
    extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    totalComment: rt.NumberC;
    totalAlerts: rt.NumberC;
    totalEvents: rt.UnionC<[rt.NumberC, rt.UndefinedC]>;
    version: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    comments: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        comment: rt.StringC;
        type: rt.LiteralC<import("../../domain").AttachmentType.user>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").AttachmentType.alert>;
        alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        rule: rt.ExactC<rt.TypeC<{
            id: rt.UnionC<[rt.StringC, rt.NullC]>;
            name: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").AttachmentType.event>;
        eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").AttachmentType.actions>;
        comment: rt.StringC;
        actions: rt.ExactC<rt.TypeC<{
            targets: rt.ArrayC<rt.ExactC<rt.TypeC<{
                hostname: rt.StringC;
                endpointId: rt.StringC;
            }>>>;
            type: rt.StringC;
        }>>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
        externalReferenceId: rt.StringC;
        externalReferenceStorage: rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.elasticSearchDoc>;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        externalReferenceId: rt.StringC;
        externalReferenceStorage: rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.savedObject>;
            soType: rt.StringC;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
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
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").AttachmentType.persistableState>;
        owner: rt.StringC;
        persistableStateAttachmentTypeId: rt.StringC;
        persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
    }>>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>]>, rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        version: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.StringC;
        attachmentId: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        data: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.StringC;
        data: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    }>>]>]>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
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
    }>>]>]>>;
    extended_fields_labels: rt.RecordC<rt.StringC, rt.StringC>;
}>>]>, rt.PartialC<{
    updateSummary: rt.ExactC<rt.TypeC<{
        syncedAlertCount: rt.NumberC;
    }>>;
}>]>;
export declare const PatchCasesResponseRt: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    description: rt.StringC;
    tags: rt.ArrayC<rt.StringC>;
    title: rt.StringC;
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
    assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
        uid: rt.StringC;
    }>>>;
    category: rt.UnionC<[rt.StringC, rt.NullC]>;
    customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        type: rt.LiteralC<import("../../domain").CustomFieldTypes.TEXT>;
        value: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        type: rt.LiteralC<import("../../domain").CustomFieldTypes.TOGGLE>;
        value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        type: rt.LiteralC<import("../../domain").CustomFieldTypes.NUMBER>;
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
    status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    duration: rt.UnionC<[rt.NumberC, rt.NullC]>;
    closed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    closed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>, rt.NullC]>;
    created_at: rt.StringC;
    created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>;
    external_service: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        connector_id: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        connector_name: rt.StringC;
        external_id: rt.StringC;
        external_title: rt.StringC;
        external_url: rt.StringC;
        pushed_at: rt.StringC;
        pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
    }>>]>, rt.NullC]>;
    updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>, rt.NullC]>;
    total_observables: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>>, rt.ExactC<rt.PartialC<{
    incremental_id: rt.UnionC<[rt.NumberC, rt.NullC]>;
    in_progress_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    time_to_acknowledge: rt.UnionC<[rt.NumberC, rt.NullC]>;
    time_to_investigate: rt.UnionC<[rt.NumberC, rt.NullC]>;
    time_to_resolve: rt.UnionC<[rt.NumberC, rt.NullC]>;
    template: rt.UnionC<[rt.NullC, rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        version: rt.NumberC;
    }>>]>;
    extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    totalComment: rt.NumberC;
    totalAlerts: rt.NumberC;
    totalEvents: rt.UnionC<[rt.NumberC, rt.UndefinedC]>;
    version: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    comments: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        comment: rt.StringC;
        type: rt.LiteralC<import("../../domain").AttachmentType.user>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").AttachmentType.alert>;
        alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        rule: rt.ExactC<rt.TypeC<{
            id: rt.UnionC<[rt.StringC, rt.NullC]>;
            name: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").AttachmentType.event>;
        eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").AttachmentType.actions>;
        comment: rt.StringC;
        actions: rt.ExactC<rt.TypeC<{
            targets: rt.ArrayC<rt.ExactC<rt.TypeC<{
                hostname: rt.StringC;
                endpointId: rt.StringC;
            }>>>;
            type: rt.StringC;
        }>>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
        externalReferenceId: rt.StringC;
        externalReferenceStorage: rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.elasticSearchDoc>;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        externalReferenceId: rt.StringC;
        externalReferenceStorage: rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.savedObject>;
            soType: rt.StringC;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
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
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").AttachmentType.persistableState>;
        owner: rt.StringC;
        persistableStateAttachmentTypeId: rt.StringC;
        persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
    }>>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
        updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
    }>>]>]>, rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        version: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.StringC;
        attachmentId: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        data: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.StringC;
        data: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    }>>]>]>, rt.ExactC<rt.TypeC<{
        created_at: rt.StringC;
        created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
        owner: rt.StringC;
        pushed_at: rt.UnionC<[rt.StringC, rt.NullC]>;
        pushed_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>, rt.NullC]>;
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
    }>>]>]>>;
    extended_fields_labels: rt.RecordC<rt.StringC, rt.StringC>;
}>>]>, rt.PartialC<{
    updateSummary: rt.ExactC<rt.TypeC<{
        syncedAlertCount: rt.NumberC;
    }>>;
}>]>>;
/**
 * Push case
 */
export declare const CasePushRequestParamsRt: rt.ExactC<rt.TypeC<{
    case_id: rt.StringC;
    connector_id: rt.StringC;
}>>;
/**
 * Taxonomies
 */
export declare const AllTagsFindRequestRt: rt.ExactC<rt.PartialC<{
    /**
     * The owner of the cases to retrieve the tags from. If no owner is provided the tags from all cases
     * that the user has access to will be returned.
     */
    owner: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
}>>;
export declare const AllCategoriesFindRequestRt: rt.ExactC<rt.PartialC<{
    /**
     * The owner of the cases to retrieve the categories from. If no owner is provided the categories
     * from all cases that the user has access to will be returned.
     */
    owner: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
}>>;
export declare const AllReportersFindRequestRt: rt.ExactC<rt.PartialC<{
    /**
     * The owner of the cases to retrieve the tags from. If no owner is provided the tags from all cases
     * that the user has access to will be returned.
     */
    owner: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
}>>;
export declare const GetTagsResponseRt: rt.ArrayC<rt.StringC>;
export declare const GetCategoriesResponseRt: rt.ArrayC<rt.StringC>;
export declare const GetReportersResponseRt: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
}>>, rt.ExactC<rt.PartialC<{
    profile_uid: rt.StringC;
}>>]>>;
/**
 * Alerts
 */
export declare const CasesByAlertIDRequestRt: rt.ExactC<rt.PartialC<{
    /**
     * The type of cases to retrieve given an alert ID. If no owner is provided, all cases
     * that the user has access to will be returned.
     */
    owner: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
}>>;
export declare const GetRelatedCasesByAlertResponseRt: rt.ArrayC<rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    title: rt.StringC;
    description: rt.StringC;
    status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
    createdAt: rt.StringC;
    totals: rt.ExactC<rt.TypeC<{
        alerts: rt.NumberC;
        events: rt.NumberC;
        userComments: rt.NumberC;
    }>>;
}>>>;
export declare const SimilarCasesSearchRequestRt: rt.PartialType<undefined, Partial<import("../../../schema/types").Pagination>, Partial<import("../../../schema/types").Pagination>, unknown>;
export declare const FindCasesContainingAllDocumentsRequestRt: rt.ExactC<rt.TypeC<{
    /**
     * The IDs of the documents to find cases for.
     */
    documentIds: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.UndefinedC]>;
    /**
     * The IDs of the alerts to find cases for. TODO: remove this in the next serverless release cycle https://github.com/elastic/security-team/issues/14718
     */
    alertIds: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.UndefinedC]>;
    caseIds: rt.ArrayC<rt.StringC>;
}>>;
export declare const FindCasesContainingAllAlertsResponseRt: rt.ExactC<rt.TypeC<{
    casesWithAllAttachments: rt.ArrayC<rt.StringC>;
}>>;
export type CasePostRequest = rt.TypeOf<typeof CasePostRequestRt>;
export type CaseResolveResponse = rt.TypeOf<typeof CaseResolveResponseRt>;
export type CasesDeleteRequest = rt.TypeOf<typeof CasesDeleteRequestRt>;
export type CasesByAlertIDRequest = rt.TypeOf<typeof CasesByAlertIDRequestRt>;
export type CasesFindRequest = rt.TypeOf<typeof CasesFindRequestRt>;
export type CasesFindRequestWithCustomFields = rt.TypeOf<typeof CasesFindRequestWithCustomFieldsRt>;
export type CasesSearchRequest = rt.TypeOf<typeof CasesSearchRequestRt>;
export type CasesFindRequestSortFields = rt.TypeOf<typeof CasesFindRequestSortFieldsRt>;
export type CasesFindResponse = rt.TypeOf<typeof CasesFindResponseRt>;
export type CasePatchRequest = rt.TypeOf<typeof CasePatchRequestRt>;
export type CasesPatchRequest = rt.TypeOf<typeof CasesPatchRequestRt>;
export type UpdateSummary = rt.TypeOf<typeof UpdateSummaryRt>;
export type CaseWithUpdateSummary = rt.TypeOf<typeof CaseWithUpdateSummaryRt>;
export type CasesPatchResponse = rt.TypeOf<typeof PatchCasesResponseRt>;
export type AllTagsFindRequest = rt.TypeOf<typeof AllTagsFindRequestRt>;
export type GetTagsResponse = rt.TypeOf<typeof GetTagsResponseRt>;
export type AllCategoriesFindRequest = rt.TypeOf<typeof AllCategoriesFindRequestRt>;
export type GetCategoriesResponse = rt.TypeOf<typeof GetCategoriesResponseRt>;
export type AllReportersFindRequest = AllTagsFindRequest;
export type GetReportersResponse = rt.TypeOf<typeof GetReportersResponseRt>;
export type CasesBulkGetRequest = rt.TypeOf<typeof CasesBulkGetRequestRt>;
export type CasesBulkGetResponse = rt.TypeOf<typeof CasesBulkGetResponseRt>;
export type GetRelatedCasesByAlertResponse = rt.TypeOf<typeof GetRelatedCasesByAlertResponseRt>;
export type CaseRequestCustomFields = rt.TypeOf<typeof CaseRequestCustomFieldsRt>;
export type CaseRequestCustomField = rt.TypeOf<typeof CustomFieldRt>;
export type BulkCreateCasesRequest = rt.TypeOf<typeof BulkCreateCasesRequestRt>;
export type BulkCreateCasesResponse = rt.TypeOf<typeof BulkCreateCasesResponseRt>;
export type SimilarCasesSearchRequest = rt.TypeOf<typeof SimilarCasesSearchRequestRt>;
export type CasesSimilarResponse = rt.TypeOf<typeof CasesSimilarResponseRt>;
export type FindCasesContainingAllDocumentsRequest = rt.TypeOf<typeof FindCasesContainingAllDocumentsRequestRt>;
export type FindCasesContainingAllAlertsResponse = rt.TypeOf<typeof FindCasesContainingAllAlertsResponseRt>;
export {};
