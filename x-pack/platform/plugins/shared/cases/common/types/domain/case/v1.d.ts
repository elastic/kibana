import * as rt from 'io-ts';
import { CaseStatuses } from '@kbn/cases-components/src/status/types';
export { CaseStatuses };
/**
 * Status
 */
export declare const CaseStatusRt: rt.UnionC<[rt.LiteralC<CaseStatuses.open>, rt.LiteralC<(typeof CaseStatuses)["in-progress"]>, rt.LiteralC<CaseStatuses.closed>]>;
export declare const caseStatuses: CaseStatuses[];
export declare const DefaultCloseReasonRt: rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>;
/**
 * Close reason
 */
export declare const CaseCloseReasonRt: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
/**
 * Severity
 */
export declare enum CaseSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare const CaseSeverityRt: rt.UnionC<[rt.LiteralC<CaseSeverity.LOW>, rt.LiteralC<CaseSeverity.MEDIUM>, rt.LiteralC<CaseSeverity.HIGH>, rt.LiteralC<CaseSeverity.CRITICAL>]>;
/**
 * Case
 */
export declare const CaseSettingsRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    syncAlerts: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    extractObservables: rt.BooleanC;
}>>]>;
export declare const CaseTemplate: rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.NumberC;
}>>;
export declare const CaseBaseOptionalFieldsRt: rt.ExactC<rt.PartialC<{
    /**
     * The description of the case
     */
    description: rt.StringC;
    /**
     * The identifying strings for filter a case
     */
    tags: rt.ArrayC<rt.StringC>;
    /**
     * The title of a case
     */
    title: rt.StringC;
    /**
     * The external system that the case can be synced with
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
     * The severity of the case
     */
    severity: rt.UnionC<[rt.LiteralC<CaseSeverity.LOW>, rt.LiteralC<CaseSeverity.MEDIUM>, rt.LiteralC<CaseSeverity.HIGH>, rt.LiteralC<CaseSeverity.CRITICAL>]>;
    /**
     * The users assigned to this case
     */
    assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
        uid: rt.StringC;
    }>>>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.StringC, rt.NullC]>;
    /**
     * An array containing the possible,
     * user-configured custom fields.
     */
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
    /**
     * The alert sync settings
     */
    settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        syncAlerts: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        extractObservables: rt.BooleanC;
    }>>]>;
    /**
     * Observables
     */
    observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        createdAt: rt.StringC;
        updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        typeKey: rt.StringC;
        value: rt.StringC;
        description: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>>;
}>>;
export declare const CaseAttributesRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * The description of the case
     */
    description: rt.StringC;
    /**
     * The identifying strings for filter a case
     */
    tags: rt.ArrayC<rt.StringC>;
    /**
     * The title of a case
     */
    title: rt.StringC;
    /**
     * The external system that the case can be synced with
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
     * The severity of the case
     */
    severity: rt.UnionC<[rt.LiteralC<CaseSeverity.LOW>, rt.LiteralC<CaseSeverity.MEDIUM>, rt.LiteralC<CaseSeverity.HIGH>, rt.LiteralC<CaseSeverity.CRITICAL>]>;
    /**
     * The users assigned to this case
     */
    assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
        uid: rt.StringC;
    }>>>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.StringC, rt.NullC]>;
    /**
     * An array containing the possible,
     * user-configured custom fields.
     */
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
    /**
     * The alert sync settings
     */
    settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        syncAlerts: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        extractObservables: rt.BooleanC;
    }>>]>;
    /**
     * Observables
     */
    observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        createdAt: rt.StringC;
        updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        typeKey: rt.StringC;
        value: rt.StringC;
        description: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>>;
    /**
     * The current status of the case (open, closed, in-progress)
     */
    status: rt.UnionC<[rt.LiteralC<CaseStatuses.open>, rt.LiteralC<(typeof CaseStatuses)["in-progress"]>, rt.LiteralC<CaseStatuses.closed>]>;
    /**
     * The plugin owner of the case
     */
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
}>>]>;
export declare const CaseRt: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * The description of the case
     */
    description: rt.StringC;
    /**
     * The identifying strings for filter a case
     */
    tags: rt.ArrayC<rt.StringC>;
    /**
     * The title of a case
     */
    title: rt.StringC;
    /**
     * The external system that the case can be synced with
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
     * The severity of the case
     */
    severity: rt.UnionC<[rt.LiteralC<CaseSeverity.LOW>, rt.LiteralC<CaseSeverity.MEDIUM>, rt.LiteralC<CaseSeverity.HIGH>, rt.LiteralC<CaseSeverity.CRITICAL>]>;
    /**
     * The users assigned to this case
     */
    assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
        uid: rt.StringC;
    }>>>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.StringC, rt.NullC]>;
    /**
     * An array containing the possible,
     * user-configured custom fields.
     */
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
    /**
     * The alert sync settings
     */
    settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        syncAlerts: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        extractObservables: rt.BooleanC;
    }>>]>;
    /**
     * Observables
     */
    observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        createdAt: rt.StringC;
        updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        typeKey: rt.StringC;
        value: rt.StringC;
        description: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>>;
    /**
     * The current status of the case (open, closed, in-progress)
     */
    status: rt.UnionC<[rt.LiteralC<CaseStatuses.open>, rt.LiteralC<(typeof CaseStatuses)["in-progress"]>, rt.LiteralC<CaseStatuses.closed>]>;
    /**
     * The plugin owner of the case
     */
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
        type: rt.LiteralC<import("..").AttachmentType.user>;
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
        type: rt.LiteralC<import("..").AttachmentType.alert>;
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
        type: rt.LiteralC<import("..").AttachmentType.event>;
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
        type: rt.LiteralC<import("..").AttachmentType.actions>;
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
            type: rt.LiteralC<import("..").ExternalReferenceStorageType.elasticSearchDoc>;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("..").AttachmentType.externalReference>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        externalReferenceId: rt.StringC;
        externalReferenceStorage: rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ExternalReferenceStorageType.savedObject>;
            soType: rt.StringC;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("..").AttachmentType.externalReference>;
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
        type: rt.LiteralC<import("..").AttachmentType.persistableState>;
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
export declare const CasesRt: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * The description of the case
     */
    description: rt.StringC;
    /**
     * The identifying strings for filter a case
     */
    tags: rt.ArrayC<rt.StringC>;
    /**
     * The title of a case
     */
    title: rt.StringC;
    /**
     * The external system that the case can be synced with
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
     * The severity of the case
     */
    severity: rt.UnionC<[rt.LiteralC<CaseSeverity.LOW>, rt.LiteralC<CaseSeverity.MEDIUM>, rt.LiteralC<CaseSeverity.HIGH>, rt.LiteralC<CaseSeverity.CRITICAL>]>;
    /**
     * The users assigned to this case
     */
    assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
        uid: rt.StringC;
    }>>>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.StringC, rt.NullC]>;
    /**
     * An array containing the possible,
     * user-configured custom fields.
     */
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
    /**
     * The alert sync settings
     */
    settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        syncAlerts: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        extractObservables: rt.BooleanC;
    }>>]>;
    /**
     * Observables
     */
    observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        createdAt: rt.StringC;
        updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        typeKey: rt.StringC;
        value: rt.StringC;
        description: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>>;
    /**
     * The current status of the case (open, closed, in-progress)
     */
    status: rt.UnionC<[rt.LiteralC<CaseStatuses.open>, rt.LiteralC<(typeof CaseStatuses)["in-progress"]>, rt.LiteralC<CaseStatuses.closed>]>;
    /**
     * The plugin owner of the case
     */
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
        type: rt.LiteralC<import("..").AttachmentType.user>;
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
        type: rt.LiteralC<import("..").AttachmentType.alert>;
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
        type: rt.LiteralC<import("..").AttachmentType.event>;
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
        type: rt.LiteralC<import("..").AttachmentType.actions>;
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
            type: rt.LiteralC<import("..").ExternalReferenceStorageType.elasticSearchDoc>;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("..").AttachmentType.externalReference>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        externalReferenceId: rt.StringC;
        externalReferenceStorage: rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ExternalReferenceStorageType.savedObject>;
            soType: rt.StringC;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("..").AttachmentType.externalReference>;
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
        type: rt.LiteralC<import("..").AttachmentType.persistableState>;
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
export declare const AttachmentTotalsRt: rt.ExactC<rt.TypeC<{
    alerts: rt.NumberC;
    events: rt.NumberC;
    userComments: rt.NumberC;
}>>;
export declare const RelatedCaseRt: rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    title: rt.StringC;
    description: rt.StringC;
    status: rt.UnionC<[rt.LiteralC<CaseStatuses.open>, rt.LiteralC<(typeof CaseStatuses)["in-progress"]>, rt.LiteralC<CaseStatuses.closed>]>;
    createdAt: rt.StringC;
    totals: rt.ExactC<rt.TypeC<{
        alerts: rt.NumberC;
        events: rt.NumberC;
        userComments: rt.NumberC;
    }>>;
}>>;
export declare const SimilarityRt: rt.ExactC<rt.TypeC<{
    typeKey: rt.StringC;
    typeLabel: rt.StringC;
    value: rt.StringC;
}>>;
export declare const SimilarCaseRt: rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * The description of the case
     */
    description: rt.StringC;
    /**
     * The identifying strings for filter a case
     */
    tags: rt.ArrayC<rt.StringC>;
    /**
     * The title of a case
     */
    title: rt.StringC;
    /**
     * The external system that the case can be synced with
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
     * The severity of the case
     */
    severity: rt.UnionC<[rt.LiteralC<CaseSeverity.LOW>, rt.LiteralC<CaseSeverity.MEDIUM>, rt.LiteralC<CaseSeverity.HIGH>, rt.LiteralC<CaseSeverity.CRITICAL>]>;
    /**
     * The users assigned to this case
     */
    assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
        uid: rt.StringC;
    }>>>;
    /**
     * The category of the case.
     */
    category: rt.UnionC<[rt.StringC, rt.NullC]>;
    /**
     * An array containing the possible,
     * user-configured custom fields.
     */
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
    /**
     * The alert sync settings
     */
    settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        syncAlerts: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        extractObservables: rt.BooleanC;
    }>>]>;
    /**
     * Observables
     */
    observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        createdAt: rt.StringC;
        updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        typeKey: rt.StringC;
        value: rt.StringC;
        description: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>>;
    /**
     * The current status of the case (open, closed, in-progress)
     */
    status: rt.UnionC<[rt.LiteralC<CaseStatuses.open>, rt.LiteralC<(typeof CaseStatuses)["in-progress"]>, rt.LiteralC<CaseStatuses.closed>]>;
    /**
     * The plugin owner of the case
     */
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
        type: rt.LiteralC<import("..").AttachmentType.user>;
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
        type: rt.LiteralC<import("..").AttachmentType.alert>;
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
        type: rt.LiteralC<import("..").AttachmentType.event>;
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
        type: rt.LiteralC<import("..").AttachmentType.actions>;
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
            type: rt.LiteralC<import("..").ExternalReferenceStorageType.elasticSearchDoc>;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("..").AttachmentType.externalReference>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        externalReferenceId: rt.StringC;
        externalReferenceStorage: rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ExternalReferenceStorageType.savedObject>;
            soType: rt.StringC;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("..").AttachmentType.externalReference>;
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
        type: rt.LiteralC<import("..").AttachmentType.persistableState>;
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
}>>]>;
export type Case = rt.TypeOf<typeof CaseRt>;
export type Cases = rt.TypeOf<typeof CasesRt>;
export type CaseAttributes = rt.TypeOf<typeof CaseAttributesRt>;
export type CaseSettings = rt.TypeOf<typeof CaseSettingsRt>;
export type RelatedCase = rt.TypeOf<typeof RelatedCaseRt>;
export type AttachmentTotals = rt.TypeOf<typeof AttachmentTotalsRt>;
export type CaseBaseOptionalFields = rt.TypeOf<typeof CaseBaseOptionalFieldsRt>;
export type SimilarCase = rt.TypeOf<typeof SimilarCaseRt>;
export type SimilarCases = SimilarCase[];
