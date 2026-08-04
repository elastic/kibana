import { z } from '@kbn/zod/v4';
import { CaseStatuses } from '@kbn/cases-components/src/status/types';
import { CaseSeverity } from '../../domain/case/v1';
export { CaseStatuses, CaseSeverity };
/**
 * Status
 */
export declare const CaseStatusSchema: z.ZodEnum<{
    closed: "closed";
    open: "open";
    "in-progress": "in-progress";
}>;
export declare const caseStatuses: CaseStatuses[];
/**
 * Severity
 */
export declare const CaseSeveritySchema: z.ZodEnum<{
    medium: "medium";
    high: "high";
    low: "low";
    critical: "critical";
}>;
/**
 * Case
 */
export declare const CaseSettingsSchema: z.ZodObject<{
    syncAlerts: z.ZodBoolean;
    extractObservables: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const CaseTemplateSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodNumber;
}, z.core.$strip>;
export declare const CaseBaseOptionalFieldsSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    title: z.ZodOptional<z.ZodString>;
    connector: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.casesWebhook>;
        fields: z.ZodNull;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.jira>;
        fields: z.ZodNullable<z.ZodObject<{
            issueType: z.ZodNullable<z.ZodString>;
            priority: z.ZodNullable<z.ZodString>;
            parent: z.ZodNullable<z.ZodString>;
            otherFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.none>;
        fields: z.ZodNull;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.resilient>;
        fields: z.ZodNullable<z.ZodObject<{
            incidentTypes: z.ZodNullable<z.ZodArray<z.ZodString>>;
            severityCode: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
        fields: z.ZodNullable<z.ZodObject<{
            impact: z.ZodNullable<z.ZodString>;
            severity: z.ZodNullable<z.ZodString>;
            urgency: z.ZodNullable<z.ZodString>;
            category: z.ZodNullable<z.ZodString>;
            subcategory: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
        fields: z.ZodNullable<z.ZodObject<{
            category: z.ZodNullable<z.ZodString>;
            destIp: z.ZodNullable<z.ZodBoolean>;
            malwareHash: z.ZodNullable<z.ZodBoolean>;
            malwareUrl: z.ZodNullable<z.ZodBoolean>;
            priority: z.ZodNullable<z.ZodString>;
            sourceIp: z.ZodNullable<z.ZodBoolean>;
            subcategory: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.swimlane>;
        fields: z.ZodNullable<z.ZodObject<{
            caseId: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.theHive>;
        fields: z.ZodNullable<z.ZodObject<{
            tlp: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>], "type">>;
    severity: z.ZodOptional<z.ZodEnum<{
        medium: "medium";
        high: "high";
        low: "low";
        critical: "critical";
    }>>;
    assignees: z.ZodOptional<z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customFields: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.TEXT>;
        value: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.TOGGLE>;
        value: z.ZodNullable<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.NUMBER>;
        value: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>]>>>;
    settings: z.ZodOptional<z.ZodObject<{
        syncAlerts: z.ZodBoolean;
        extractObservables: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    observables: z.ZodOptional<z.ZodArray<z.ZodObject<{
        typeKey: z.ZodString;
        value: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const CaseAttributesSchema: z.ZodObject<{
    description: z.ZodString;
    tags: z.ZodArray<z.ZodString>;
    title: z.ZodString;
    connector: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.casesWebhook>;
        fields: z.ZodNull;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.jira>;
        fields: z.ZodNullable<z.ZodObject<{
            issueType: z.ZodNullable<z.ZodString>;
            priority: z.ZodNullable<z.ZodString>;
            parent: z.ZodNullable<z.ZodString>;
            otherFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.none>;
        fields: z.ZodNull;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.resilient>;
        fields: z.ZodNullable<z.ZodObject<{
            incidentTypes: z.ZodNullable<z.ZodArray<z.ZodString>>;
            severityCode: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
        fields: z.ZodNullable<z.ZodObject<{
            impact: z.ZodNullable<z.ZodString>;
            severity: z.ZodNullable<z.ZodString>;
            urgency: z.ZodNullable<z.ZodString>;
            category: z.ZodNullable<z.ZodString>;
            subcategory: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
        fields: z.ZodNullable<z.ZodObject<{
            category: z.ZodNullable<z.ZodString>;
            destIp: z.ZodNullable<z.ZodBoolean>;
            malwareHash: z.ZodNullable<z.ZodBoolean>;
            malwareUrl: z.ZodNullable<z.ZodBoolean>;
            priority: z.ZodNullable<z.ZodString>;
            sourceIp: z.ZodNullable<z.ZodBoolean>;
            subcategory: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.swimlane>;
        fields: z.ZodNullable<z.ZodObject<{
            caseId: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.theHive>;
        fields: z.ZodNullable<z.ZodObject<{
            tlp: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>], "type">;
    severity: z.ZodEnum<{
        medium: "medium";
        high: "high";
        low: "low";
        critical: "critical";
    }>;
    assignees: z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    category: z.ZodNullable<z.ZodString>;
    customFields: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.TEXT>;
        value: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.TOGGLE>;
        value: z.ZodNullable<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.NUMBER>;
        value: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>]>>;
    settings: z.ZodObject<{
        syncAlerts: z.ZodBoolean;
        extractObservables: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
    observables: z.ZodArray<z.ZodObject<{
        typeKey: z.ZodString;
        value: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    status: z.ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>;
    owner: z.ZodString;
    duration: z.ZodNullable<z.ZodNumber>;
    closed_at: z.ZodNullable<z.ZodString>;
    closed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    external_service: z.ZodNullable<z.ZodObject<{
        connector_name: z.ZodString;
        external_id: z.ZodString;
        external_title: z.ZodString;
        external_url: z.ZodString;
        pushed_at: z.ZodString;
        pushed_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        connector_id: z.ZodString;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    total_observables: z.ZodNullable<z.ZodNumber>;
    incremental_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    in_progress_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    time_to_acknowledge: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    time_to_investigate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    time_to_resolve: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    template: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        version: z.ZodNumber;
    }, z.core.$strip>>>;
    extended_fields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
export declare const CaseSchema: z.ZodObject<{
    description: z.ZodString;
    tags: z.ZodArray<z.ZodString>;
    title: z.ZodString;
    connector: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.casesWebhook>;
        fields: z.ZodNull;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.jira>;
        fields: z.ZodNullable<z.ZodObject<{
            issueType: z.ZodNullable<z.ZodString>;
            priority: z.ZodNullable<z.ZodString>;
            parent: z.ZodNullable<z.ZodString>;
            otherFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.none>;
        fields: z.ZodNull;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.resilient>;
        fields: z.ZodNullable<z.ZodObject<{
            incidentTypes: z.ZodNullable<z.ZodArray<z.ZodString>>;
            severityCode: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
        fields: z.ZodNullable<z.ZodObject<{
            impact: z.ZodNullable<z.ZodString>;
            severity: z.ZodNullable<z.ZodString>;
            urgency: z.ZodNullable<z.ZodString>;
            category: z.ZodNullable<z.ZodString>;
            subcategory: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
        fields: z.ZodNullable<z.ZodObject<{
            category: z.ZodNullable<z.ZodString>;
            destIp: z.ZodNullable<z.ZodBoolean>;
            malwareHash: z.ZodNullable<z.ZodBoolean>;
            malwareUrl: z.ZodNullable<z.ZodBoolean>;
            priority: z.ZodNullable<z.ZodString>;
            sourceIp: z.ZodNullable<z.ZodBoolean>;
            subcategory: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.swimlane>;
        fields: z.ZodNullable<z.ZodObject<{
            caseId: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.theHive>;
        fields: z.ZodNullable<z.ZodObject<{
            tlp: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>], "type">;
    severity: z.ZodEnum<{
        medium: "medium";
        high: "high";
        low: "low";
        critical: "critical";
    }>;
    assignees: z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    category: z.ZodNullable<z.ZodString>;
    customFields: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.TEXT>;
        value: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.TOGGLE>;
        value: z.ZodNullable<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.NUMBER>;
        value: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>]>>;
    settings: z.ZodObject<{
        syncAlerts: z.ZodBoolean;
        extractObservables: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
    observables: z.ZodArray<z.ZodObject<{
        typeKey: z.ZodString;
        value: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    status: z.ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>;
    owner: z.ZodString;
    duration: z.ZodNullable<z.ZodNumber>;
    closed_at: z.ZodNullable<z.ZodString>;
    closed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    external_service: z.ZodNullable<z.ZodObject<{
        connector_name: z.ZodString;
        external_id: z.ZodString;
        external_title: z.ZodString;
        external_url: z.ZodString;
        pushed_at: z.ZodString;
        pushed_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        connector_id: z.ZodString;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    total_observables: z.ZodNullable<z.ZodNumber>;
    incremental_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    in_progress_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    time_to_acknowledge: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    time_to_investigate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    time_to_resolve: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    template: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        version: z.ZodNumber;
    }, z.core.$strip>>>;
    extended_fields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    id: z.ZodString;
    totalComment: z.ZodNumber;
    totalAlerts: z.ZodNumber;
    totalEvents: z.ZodOptional<z.ZodNumber>;
    version: z.ZodString;
    comments: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
        comment: z.ZodString;
        type: z.ZodLiteral<import("../../domain").AttachmentType.user>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.alert>;
        alertId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        rule: z.ZodObject<{
            id: z.ZodNullable<z.ZodString>;
            name: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.event>;
        eventId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.actions>;
        comment: z.ZodString;
        actions: z.ZodObject<{
            targets: z.ZodArray<z.ZodObject<{
                hostname: z.ZodString;
                endpointId: z.ZodString;
            }, z.core.$strip>>;
            type: z.ZodString;
        }, z.core.$strip>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
        externalReferenceAttachmentTypeId: z.ZodString;
        externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
        type: z.ZodLiteral<import("../../domain").AttachmentType.externalReference>;
        owner: z.ZodString;
        externalReferenceId: z.ZodString;
        externalReferenceStorage: z.ZodObject<{
            type: z.ZodLiteral<import("../../domain").ExternalReferenceStorageType.elasticSearchDoc>;
        }, z.core.$strip>;
    }, z.core.$strip>, z.ZodObject<{
        externalReferenceAttachmentTypeId: z.ZodString;
        externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
        type: z.ZodLiteral<import("../../domain").AttachmentType.externalReference>;
        owner: z.ZodString;
        externalReferenceId: z.ZodString;
        externalReferenceStorage: z.ZodObject<{
            type: z.ZodLiteral<import("../../domain").ExternalReferenceStorageType.savedObject>;
            soType: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>]>, z.ZodObject<{
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.persistableState>;
        persistableStateAttachmentTypeId: z.ZodString;
        persistableStateAttachmentState: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>]>, z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodString;
        attachmentId: z.ZodString;
        owner: z.ZodString;
        data: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
        owner: z.ZodString;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    }, z.core.$strip>]>, z.ZodObject<{
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>, z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, z.core.$strip>>]>>>;
}, z.core.$strip>;
export declare const CasesSchema: z.ZodArray<z.ZodObject<{
    description: z.ZodString;
    tags: z.ZodArray<z.ZodString>;
    title: z.ZodString;
    connector: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.casesWebhook>;
        fields: z.ZodNull;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.jira>;
        fields: z.ZodNullable<z.ZodObject<{
            issueType: z.ZodNullable<z.ZodString>;
            priority: z.ZodNullable<z.ZodString>;
            parent: z.ZodNullable<z.ZodString>;
            otherFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.none>;
        fields: z.ZodNull;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.resilient>;
        fields: z.ZodNullable<z.ZodObject<{
            incidentTypes: z.ZodNullable<z.ZodArray<z.ZodString>>;
            severityCode: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
        fields: z.ZodNullable<z.ZodObject<{
            impact: z.ZodNullable<z.ZodString>;
            severity: z.ZodNullable<z.ZodString>;
            urgency: z.ZodNullable<z.ZodString>;
            category: z.ZodNullable<z.ZodString>;
            subcategory: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
        fields: z.ZodNullable<z.ZodObject<{
            category: z.ZodNullable<z.ZodString>;
            destIp: z.ZodNullable<z.ZodBoolean>;
            malwareHash: z.ZodNullable<z.ZodBoolean>;
            malwareUrl: z.ZodNullable<z.ZodBoolean>;
            priority: z.ZodNullable<z.ZodString>;
            sourceIp: z.ZodNullable<z.ZodBoolean>;
            subcategory: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.swimlane>;
        fields: z.ZodNullable<z.ZodObject<{
            caseId: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.theHive>;
        fields: z.ZodNullable<z.ZodObject<{
            tlp: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>], "type">;
    severity: z.ZodEnum<{
        medium: "medium";
        high: "high";
        low: "low";
        critical: "critical";
    }>;
    assignees: z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    category: z.ZodNullable<z.ZodString>;
    customFields: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.TEXT>;
        value: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.TOGGLE>;
        value: z.ZodNullable<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.NUMBER>;
        value: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>]>>;
    settings: z.ZodObject<{
        syncAlerts: z.ZodBoolean;
        extractObservables: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
    observables: z.ZodArray<z.ZodObject<{
        typeKey: z.ZodString;
        value: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    status: z.ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>;
    owner: z.ZodString;
    duration: z.ZodNullable<z.ZodNumber>;
    closed_at: z.ZodNullable<z.ZodString>;
    closed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    external_service: z.ZodNullable<z.ZodObject<{
        connector_name: z.ZodString;
        external_id: z.ZodString;
        external_title: z.ZodString;
        external_url: z.ZodString;
        pushed_at: z.ZodString;
        pushed_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        connector_id: z.ZodString;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    total_observables: z.ZodNullable<z.ZodNumber>;
    incremental_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    in_progress_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    time_to_acknowledge: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    time_to_investigate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    time_to_resolve: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    template: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        version: z.ZodNumber;
    }, z.core.$strip>>>;
    extended_fields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    id: z.ZodString;
    totalComment: z.ZodNumber;
    totalAlerts: z.ZodNumber;
    totalEvents: z.ZodOptional<z.ZodNumber>;
    version: z.ZodString;
    comments: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
        comment: z.ZodString;
        type: z.ZodLiteral<import("../../domain").AttachmentType.user>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.alert>;
        alertId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        rule: z.ZodObject<{
            id: z.ZodNullable<z.ZodString>;
            name: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.event>;
        eventId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.actions>;
        comment: z.ZodString;
        actions: z.ZodObject<{
            targets: z.ZodArray<z.ZodObject<{
                hostname: z.ZodString;
                endpointId: z.ZodString;
            }, z.core.$strip>>;
            type: z.ZodString;
        }, z.core.$strip>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
        externalReferenceAttachmentTypeId: z.ZodString;
        externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
        type: z.ZodLiteral<import("../../domain").AttachmentType.externalReference>;
        owner: z.ZodString;
        externalReferenceId: z.ZodString;
        externalReferenceStorage: z.ZodObject<{
            type: z.ZodLiteral<import("../../domain").ExternalReferenceStorageType.elasticSearchDoc>;
        }, z.core.$strip>;
    }, z.core.$strip>, z.ZodObject<{
        externalReferenceAttachmentTypeId: z.ZodString;
        externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
        type: z.ZodLiteral<import("../../domain").AttachmentType.externalReference>;
        owner: z.ZodString;
        externalReferenceId: z.ZodString;
        externalReferenceStorage: z.ZodObject<{
            type: z.ZodLiteral<import("../../domain").ExternalReferenceStorageType.savedObject>;
            soType: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>]>, z.ZodObject<{
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.persistableState>;
        persistableStateAttachmentTypeId: z.ZodString;
        persistableStateAttachmentState: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>]>, z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodString;
        attachmentId: z.ZodString;
        owner: z.ZodString;
        data: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
        owner: z.ZodString;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    }, z.core.$strip>]>, z.ZodObject<{
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>, z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, z.core.$strip>>]>>>;
}, z.core.$strip>>;
export declare const AttachmentTotalsSchema: z.ZodObject<{
    alerts: z.ZodNumber;
    events: z.ZodNumber;
    userComments: z.ZodNumber;
}, z.core.$strip>;
export declare const RelatedCaseSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    status: z.ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>;
    createdAt: z.ZodString;
    totals: z.ZodObject<{
        alerts: z.ZodNumber;
        events: z.ZodNumber;
        userComments: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const SimilaritySchema: z.ZodObject<{
    typeKey: z.ZodString;
    typeLabel: z.ZodString;
    value: z.ZodString;
}, z.core.$strip>;
export declare const SimilarCaseSchema: z.ZodObject<{
    description: z.ZodString;
    tags: z.ZodArray<z.ZodString>;
    title: z.ZodString;
    connector: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.casesWebhook>;
        fields: z.ZodNull;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.jira>;
        fields: z.ZodNullable<z.ZodObject<{
            issueType: z.ZodNullable<z.ZodString>;
            priority: z.ZodNullable<z.ZodString>;
            parent: z.ZodNullable<z.ZodString>;
            otherFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.none>;
        fields: z.ZodNull;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.resilient>;
        fields: z.ZodNullable<z.ZodObject<{
            incidentTypes: z.ZodNullable<z.ZodArray<z.ZodString>>;
            severityCode: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.serviceNowITSM>;
        fields: z.ZodNullable<z.ZodObject<{
            impact: z.ZodNullable<z.ZodString>;
            severity: z.ZodNullable<z.ZodString>;
            urgency: z.ZodNullable<z.ZodString>;
            category: z.ZodNullable<z.ZodString>;
            subcategory: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.serviceNowSIR>;
        fields: z.ZodNullable<z.ZodObject<{
            category: z.ZodNullable<z.ZodString>;
            destIp: z.ZodNullable<z.ZodBoolean>;
            malwareHash: z.ZodNullable<z.ZodBoolean>;
            malwareUrl: z.ZodNullable<z.ZodBoolean>;
            priority: z.ZodNullable<z.ZodString>;
            sourceIp: z.ZodNullable<z.ZodBoolean>;
            subcategory: z.ZodNullable<z.ZodString>;
            additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.swimlane>;
        fields: z.ZodNullable<z.ZodObject<{
            caseId: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../connector/v1").ConnectorTypes.theHive>;
        fields: z.ZodNullable<z.ZodObject<{
            tlp: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>>;
        name: z.ZodString;
        id: z.ZodString;
    }, z.core.$strip>], "type">;
    severity: z.ZodEnum<{
        medium: "medium";
        high: "high";
        low: "low";
        critical: "critical";
    }>;
    assignees: z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    category: z.ZodNullable<z.ZodString>;
    customFields: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.TEXT>;
        value: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.TOGGLE>;
        value: z.ZodNullable<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        type: z.ZodLiteral<import("../../domain").CustomFieldTypes.NUMBER>;
        value: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>]>>;
    settings: z.ZodObject<{
        syncAlerts: z.ZodBoolean;
        extractObservables: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
    observables: z.ZodArray<z.ZodObject<{
        typeKey: z.ZodString;
        value: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    status: z.ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>;
    owner: z.ZodString;
    duration: z.ZodNullable<z.ZodNumber>;
    closed_at: z.ZodNullable<z.ZodString>;
    closed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    external_service: z.ZodNullable<z.ZodObject<{
        connector_name: z.ZodString;
        external_id: z.ZodString;
        external_title: z.ZodString;
        external_url: z.ZodString;
        pushed_at: z.ZodString;
        pushed_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        connector_id: z.ZodString;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    total_observables: z.ZodNullable<z.ZodNumber>;
    incremental_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    in_progress_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    time_to_acknowledge: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    time_to_investigate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    time_to_resolve: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    template: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        version: z.ZodNumber;
    }, z.core.$strip>>>;
    extended_fields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    id: z.ZodString;
    totalComment: z.ZodNumber;
    totalAlerts: z.ZodNumber;
    totalEvents: z.ZodOptional<z.ZodNumber>;
    version: z.ZodString;
    comments: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
        comment: z.ZodString;
        type: z.ZodLiteral<import("../../domain").AttachmentType.user>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.alert>;
        alertId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        rule: z.ZodObject<{
            id: z.ZodNullable<z.ZodString>;
            name: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.event>;
        eventId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.actions>;
        comment: z.ZodString;
        actions: z.ZodObject<{
            targets: z.ZodArray<z.ZodObject<{
                hostname: z.ZodString;
                endpointId: z.ZodString;
            }, z.core.$strip>>;
            type: z.ZodString;
        }, z.core.$strip>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
        externalReferenceAttachmentTypeId: z.ZodString;
        externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
        type: z.ZodLiteral<import("../../domain").AttachmentType.externalReference>;
        owner: z.ZodString;
        externalReferenceId: z.ZodString;
        externalReferenceStorage: z.ZodObject<{
            type: z.ZodLiteral<import("../../domain").ExternalReferenceStorageType.elasticSearchDoc>;
        }, z.core.$strip>;
    }, z.core.$strip>, z.ZodObject<{
        externalReferenceAttachmentTypeId: z.ZodString;
        externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
        type: z.ZodLiteral<import("../../domain").AttachmentType.externalReference>;
        owner: z.ZodString;
        externalReferenceId: z.ZodString;
        externalReferenceStorage: z.ZodObject<{
            type: z.ZodLiteral<import("../../domain").ExternalReferenceStorageType.savedObject>;
            soType: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>]>, z.ZodObject<{
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>, z.ZodObject<{
        type: z.ZodLiteral<import("../../domain").AttachmentType.persistableState>;
        persistableStateAttachmentTypeId: z.ZodString;
        persistableStateAttachmentState: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>]>, z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodString;
        attachmentId: z.ZodString;
        owner: z.ZodString;
        data: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
        owner: z.ZodString;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    }, z.core.$strip>]>, z.ZodObject<{
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        owner: z.ZodString;
        pushed_at: z.ZodNullable<z.ZodString>;
        pushed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>, z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, z.core.$strip>>]>>>;
    similarities: z.ZodObject<{
        observables: z.ZodArray<z.ZodObject<{
            typeKey: z.ZodString;
            typeLabel: z.ZodString;
            value: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type Case = z.infer<typeof CaseSchema>;
export type Cases = z.infer<typeof CasesSchema>;
export type CaseAttributes = z.infer<typeof CaseAttributesSchema>;
export type CaseSettings = z.infer<typeof CaseSettingsSchema>;
export type RelatedCase = z.infer<typeof RelatedCaseSchema>;
export type AttachmentTotals = z.infer<typeof AttachmentTotalsSchema>;
export type CaseBaseOptionalFields = z.infer<typeof CaseBaseOptionalFieldsSchema>;
export type SimilarCase = z.infer<typeof SimilarCaseSchema>;
export type SimilarCases = SimilarCase[];
