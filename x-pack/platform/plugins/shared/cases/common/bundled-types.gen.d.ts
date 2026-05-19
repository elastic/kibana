import { z } from '@kbn/zod/v4';
/**
 * An array containing users that are assigned to the case.
 */
export declare const Assignees: z.ZodNullable<z.ZodArray<z.ZodObject<{
    uid: z.ZodString;
}, z.core.$strip>>>;
export type Assignees = z.infer<typeof Assignees>;
/**
 * Defines properties for connectors when type is `.none`.
 */
export declare const ConnectorPropertiesNone: z.ZodObject<{
    fields: z.ZodNullable<z.ZodString>;
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodLiteral<".none">;
}, z.core.$strip>;
export type ConnectorPropertiesNone = z.infer<typeof ConnectorPropertiesNone>;
/**
 * Defines properties for connectors when type is `.cases-webhook`.
 */
export declare const ConnectorPropertiesCasesWebhook: z.ZodObject<{
    fields: z.ZodNullable<z.ZodString>;
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodLiteral<".cases-webhook">;
}, z.core.$strip>;
export type ConnectorPropertiesCasesWebhook = z.infer<typeof ConnectorPropertiesCasesWebhook>;
/**
 * Defines properties for connectors when type is `.jira`.
 */
export declare const ConnectorPropertiesJira: z.ZodObject<{
    fields: z.ZodObject<{
        issueType: z.ZodNullable<z.ZodString>;
        parent: z.ZodNullable<z.ZodString>;
        priority: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodLiteral<".jira">;
}, z.core.$strip>;
export type ConnectorPropertiesJira = z.infer<typeof ConnectorPropertiesJira>;
/**
 * Defines properties for connectors when type is `.resilient`.
 */
export declare const ConnectorPropertiesResilient: z.ZodObject<{
    fields: z.ZodNullable<z.ZodObject<{
        issueTypes: z.ZodArray<z.ZodString>;
        severityCode: z.ZodString;
    }, z.core.$strip>>;
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodLiteral<".resilient">;
}, z.core.$strip>;
export type ConnectorPropertiesResilient = z.infer<typeof ConnectorPropertiesResilient>;
/**
 * Defines properties for connectors when type is `.servicenow`.
 */
export declare const ConnectorPropertiesServicenow: z.ZodObject<{
    fields: z.ZodObject<{
        category: z.ZodNullable<z.ZodString>;
        impact: z.ZodNullable<z.ZodString>;
        severity: z.ZodNullable<z.ZodString>;
        subcategory: z.ZodNullable<z.ZodString>;
        urgency: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodLiteral<".servicenow">;
}, z.core.$strip>;
export type ConnectorPropertiesServicenow = z.infer<typeof ConnectorPropertiesServicenow>;
/**
 * Defines properties for connectors when type is `.servicenow-sir`.
 */
export declare const ConnectorPropertiesServicenowSir: z.ZodObject<{
    fields: z.ZodObject<{
        category: z.ZodNullable<z.ZodString>;
        destIp: z.ZodNullable<z.ZodBoolean>;
        malwareHash: z.ZodNullable<z.ZodBoolean>;
        malwareUrl: z.ZodNullable<z.ZodBoolean>;
        priority: z.ZodNullable<z.ZodString>;
        sourceIp: z.ZodNullable<z.ZodBoolean>;
        subcategory: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodLiteral<".servicenow-sir">;
}, z.core.$strip>;
export type ConnectorPropertiesServicenowSir = z.infer<typeof ConnectorPropertiesServicenowSir>;
/**
 * Defines properties for connectors when type is `.swimlane`.
 */
export declare const ConnectorPropertiesSwimlane: z.ZodObject<{
    fields: z.ZodObject<{
        caseId: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodLiteral<".swimlane">;
}, z.core.$strip>;
export type ConnectorPropertiesSwimlane = z.infer<typeof ConnectorPropertiesSwimlane>;
/**
 * The description for the case.
 */
export declare const CaseDescription: z.ZodString;
export type CaseDescription = z.infer<typeof CaseDescription>;
/**
  * The application that owns the cases: Stack Management, Observability, or Elastic Security.

  */
export declare const Owner: z.ZodEnum<{
    cases: "cases";
    observability: "observability";
    securitySolution: "securitySolution";
}>;
export type Owner = z.infer<typeof Owner>;
export type OwnerEnum = typeof Owner.enum;
export declare const OwnerEnum: {
    cases: "cases";
    observability: "observability";
    securitySolution: "securitySolution";
};
/**
 * An object that contains the case settings.
 */
export declare const Settings: z.ZodObject<{
    syncAlerts: z.ZodBoolean;
    extractObservables: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type Settings = z.infer<typeof Settings>;
/**
 * The severity of the case.
 */
export declare const CaseSeverity: z.ZodEnum<{
    critical: "critical";
    medium: "medium";
    high: "high";
    low: "low";
}>;
export type CaseSeverity = z.infer<typeof CaseSeverity>;
export type CaseSeverityEnum = typeof CaseSeverity.enum;
export declare const CaseSeverityEnum: {
    critical: "critical";
    medium: "medium";
    high: "high";
    low: "low";
};
/**
  * The words and phrases that help categorize cases. It can be an empty array.

  */
export declare const CaseTags: z.ZodArray<z.ZodString>;
export type CaseTags = z.infer<typeof CaseTags>;
/**
 * A word or phrase that categorizes the case.
 */
export declare const CaseCategory: z.ZodString;
export type CaseCategory = z.infer<typeof CaseCategory>;
/**
 * A title for the case.
 */
export declare const CaseTitle: z.ZodString;
export type CaseTitle = z.infer<typeof CaseTitle>;
/**
 * The create case API request body varies depending on the type of connector.
 */
export declare const CreateCaseRequest: z.ZodObject<{
    assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
    }, z.core.$strip>>>>;
    connector: z.ZodUnion<readonly [z.ZodObject<{
        fields: z.ZodNullable<z.ZodString>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".none">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodNullable<z.ZodString>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".cases-webhook">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            issueType: z.ZodNullable<z.ZodString>;
            parent: z.ZodNullable<z.ZodString>;
            priority: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".jira">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodNullable<z.ZodObject<{
            issueTypes: z.ZodArray<z.ZodString>;
            severityCode: z.ZodString;
        }, z.core.$strip>>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".resilient">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            category: z.ZodNullable<z.ZodString>;
            impact: z.ZodNullable<z.ZodString>;
            severity: z.ZodNullable<z.ZodString>;
            subcategory: z.ZodNullable<z.ZodString>;
            urgency: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".servicenow">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            category: z.ZodNullable<z.ZodString>;
            destIp: z.ZodNullable<z.ZodBoolean>;
            malwareHash: z.ZodNullable<z.ZodBoolean>;
            malwareUrl: z.ZodNullable<z.ZodBoolean>;
            priority: z.ZodNullable<z.ZodString>;
            sourceIp: z.ZodNullable<z.ZodBoolean>;
            subcategory: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".servicenow-sir">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            caseId: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".swimlane">;
    }, z.core.$strip>]>;
    description: z.ZodString;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    settings: z.ZodObject<{
        syncAlerts: z.ZodBoolean;
        extractObservables: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
    severity: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        medium: "medium";
        high: "high";
        low: "low";
    }>>;
    tags: z.ZodArray<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        type: z.ZodEnum<{
            text: "text";
            toggle: "toggle";
        }>;
        value: z.ZodUnion<readonly [z.ZodNullable<z.ZodString>, z.ZodBoolean]>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type CreateCaseRequest = z.infer<typeof CreateCaseRequest>;
export declare const CaseResponseClosedByProperties: z.ZodNullable<z.ZodObject<{
    email: z.ZodNullable<z.ZodString>;
    full_name: z.ZodNullable<z.ZodString>;
    username: z.ZodNullable<z.ZodString>;
    profile_uid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
export type CaseResponseClosedByProperties = z.infer<typeof CaseResponseClosedByProperties>;
export declare const AlertCommentResponseProperties: z.ZodObject<{
    alertId: z.ZodOptional<z.ZodArray<z.ZodString>>;
    created_at: z.ZodOptional<z.ZodString>;
    created_by: z.ZodOptional<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    id: z.ZodOptional<z.ZodString>;
    index: z.ZodOptional<z.ZodArray<z.ZodString>>;
    owner: z.ZodOptional<z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>>;
    pushed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    rule: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<"alert">;
    updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updated_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    version: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AlertCommentResponseProperties = z.infer<typeof AlertCommentResponseProperties>;
export declare const CaseResponseCreatedByProperties: z.ZodObject<{
    email: z.ZodNullable<z.ZodString>;
    full_name: z.ZodNullable<z.ZodString>;
    username: z.ZodNullable<z.ZodString>;
    profile_uid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CaseResponseCreatedByProperties = z.infer<typeof CaseResponseCreatedByProperties>;
export declare const CaseResponsePushedByProperties: z.ZodNullable<z.ZodObject<{
    email: z.ZodNullable<z.ZodString>;
    full_name: z.ZodNullable<z.ZodString>;
    username: z.ZodNullable<z.ZodString>;
    profile_uid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
export type CaseResponsePushedByProperties = z.infer<typeof CaseResponsePushedByProperties>;
export declare const CaseResponseUpdatedByProperties: z.ZodNullable<z.ZodObject<{
    email: z.ZodNullable<z.ZodString>;
    full_name: z.ZodNullable<z.ZodString>;
    username: z.ZodNullable<z.ZodString>;
    profile_uid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
export type CaseResponseUpdatedByProperties = z.infer<typeof CaseResponseUpdatedByProperties>;
export declare const EventCommentResponseProperties: z.ZodObject<{
    created_at: z.ZodOptional<z.ZodString>;
    created_by: z.ZodOptional<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    eventId: z.ZodOptional<z.ZodArray<z.ZodString>>;
    id: z.ZodOptional<z.ZodString>;
    index: z.ZodOptional<z.ZodArray<z.ZodString>>;
    owner: z.ZodOptional<z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>>;
    pushed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    type: z.ZodLiteral<"event">;
    updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updated_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    version: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type EventCommentResponseProperties = z.infer<typeof EventCommentResponseProperties>;
export declare const UserCommentResponseProperties: z.ZodObject<{
    comment: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    created_by: z.ZodOptional<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    id: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>>;
    pushed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    type: z.ZodLiteral<"user">;
    updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updated_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    version: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UserCommentResponseProperties = z.infer<typeof UserCommentResponseProperties>;
export declare const ExternalService: z.ZodNullable<z.ZodObject<{
    connector_id: z.ZodOptional<z.ZodString>;
    connector_name: z.ZodOptional<z.ZodString>;
    external_id: z.ZodOptional<z.ZodString>;
    external_title: z.ZodOptional<z.ZodString>;
    external_url: z.ZodOptional<z.ZodString>;
    pushed_at: z.ZodOptional<z.ZodString>;
    pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>>;
export type ExternalService = z.infer<typeof ExternalService>;
/**
 * A single observable attached to a case.
 */
export declare const CaseObservable: z.ZodObject<{
    id: z.ZodString;
    typeKey: z.ZodString;
    value: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type CaseObservable = z.infer<typeof CaseObservable>;
/**
 * The status of the case.
 */
export declare const CaseStatus: z.ZodEnum<{
    closed: "closed";
    open: "open";
    "in-progress": "in-progress";
}>;
export type CaseStatus = z.infer<typeof CaseStatus>;
export type CaseStatusEnum = typeof CaseStatus.enum;
export declare const CaseStatusEnum: {
    closed: "closed";
    open: "open";
    "in-progress": "in-progress";
};
export declare const CaseResponseProperties: z.ZodObject<{
    assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
    }, z.core.$strip>>>>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    closed_at: z.ZodNullable<z.ZodString>;
    closed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    comments: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        alertId: z.ZodOptional<z.ZodArray<z.ZodString>>;
        created_at: z.ZodOptional<z.ZodString>;
        created_by: z.ZodOptional<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        id: z.ZodOptional<z.ZodString>;
        index: z.ZodOptional<z.ZodArray<z.ZodString>>;
        owner: z.ZodOptional<z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        pushed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        rule: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"alert">;
        updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updated_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        version: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        created_at: z.ZodOptional<z.ZodString>;
        created_by: z.ZodOptional<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        eventId: z.ZodOptional<z.ZodArray<z.ZodString>>;
        id: z.ZodOptional<z.ZodString>;
        index: z.ZodOptional<z.ZodArray<z.ZodString>>;
        owner: z.ZodOptional<z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        pushed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"event">;
        updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updated_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        version: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        comment: z.ZodOptional<z.ZodString>;
        created_at: z.ZodOptional<z.ZodString>;
        created_by: z.ZodOptional<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        id: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        pushed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"user">;
        updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updated_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        version: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>], "type">>;
    connector: z.ZodDiscriminatedUnion<[z.ZodObject<{
        fields: z.ZodNullable<z.ZodString>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".none">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodNullable<z.ZodString>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".cases-webhook">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            issueType: z.ZodNullable<z.ZodString>;
            parent: z.ZodNullable<z.ZodString>;
            priority: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".jira">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodNullable<z.ZodObject<{
            issueTypes: z.ZodArray<z.ZodString>;
            severityCode: z.ZodString;
        }, z.core.$strip>>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".resilient">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            category: z.ZodNullable<z.ZodString>;
            impact: z.ZodNullable<z.ZodString>;
            severity: z.ZodNullable<z.ZodString>;
            subcategory: z.ZodNullable<z.ZodString>;
            urgency: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".servicenow">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            category: z.ZodNullable<z.ZodString>;
            destIp: z.ZodNullable<z.ZodBoolean>;
            malwareHash: z.ZodNullable<z.ZodBoolean>;
            malwareUrl: z.ZodNullable<z.ZodBoolean>;
            priority: z.ZodNullable<z.ZodString>;
            sourceIp: z.ZodNullable<z.ZodBoolean>;
            subcategory: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".servicenow-sir">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            caseId: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".swimlane">;
    }, z.core.$strip>], "type">;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        key: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<{
            text: "text";
            toggle: "toggle";
        }>>;
        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodNullable<z.ZodString>, z.ZodBoolean]>>;
    }, z.core.$strip>>>;
    description: z.ZodString;
    duration: z.ZodNullable<z.ZodNumber>;
    external_service: z.ZodNullable<z.ZodObject<{
        connector_id: z.ZodOptional<z.ZodString>;
        connector_name: z.ZodOptional<z.ZodString>;
        external_id: z.ZodOptional<z.ZodString>;
        external_title: z.ZodOptional<z.ZodString>;
        external_url: z.ZodOptional<z.ZodString>;
        pushed_at: z.ZodOptional<z.ZodString>;
        pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    id: z.ZodString;
    incremental_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    observables: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        typeKey: z.ZodString;
        value: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    settings: z.ZodObject<{
        syncAlerts: z.ZodBoolean;
        extractObservables: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
    severity: z.ZodEnum<{
        critical: "critical";
        medium: "medium";
        high: "high";
        low: "low";
    }>;
    status: z.ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>;
    tags: z.ZodArray<z.ZodString>;
    title: z.ZodString;
    totalAlerts: z.ZodNumber;
    totalComment: z.ZodNumber;
    total_observables: z.ZodNullable<z.ZodNumber>;
    totalEvents: z.ZodOptional<z.ZodNumber>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    version: z.ZodString;
}, z.core.$strip>;
export type CaseResponseProperties = z.infer<typeof CaseResponseProperties>;
export declare const Response4Xx: z.ZodObject<{
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
    statusCode: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type Response4Xx = z.infer<typeof Response4Xx>;
/**
  * The close reason to sync to attached alerts when closing the case. Can be one of following predefined reasons: [false_positive, duplicate, true_positive, benign_positive, automated_closure, other] or a custom reason provided by the user.

  */
export declare const CaseCloseSyncReason: z.ZodUnion<readonly [z.ZodEnum<{
    other: "other";
    duplicate: "duplicate";
    false_positive: "false_positive";
    true_positive: "true_positive";
    benign_positive: "benign_positive";
    automated_closure: "automated_closure";
}>, z.ZodString]>;
export type CaseCloseSyncReason = z.infer<typeof CaseCloseSyncReason>;
/**
 * The update case API request body varies depending on the type of connector.
 */
export declare const UpdateCaseRequest: z.ZodObject<{
    cases: z.ZodArray<z.ZodObject<{
        assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uid: z.ZodString;
        }, z.core.$strip>>>>;
        category: z.ZodOptional<z.ZodString>;
        connector: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            fields: z.ZodNullable<z.ZodString>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".none">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodNullable<z.ZodString>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".cases-webhook">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodObject<{
                issueType: z.ZodNullable<z.ZodString>;
                parent: z.ZodNullable<z.ZodString>;
                priority: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".jira">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodNullable<z.ZodObject<{
                issueTypes: z.ZodArray<z.ZodString>;
                severityCode: z.ZodString;
            }, z.core.$strip>>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".resilient">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodObject<{
                category: z.ZodNullable<z.ZodString>;
                impact: z.ZodNullable<z.ZodString>;
                severity: z.ZodNullable<z.ZodString>;
                subcategory: z.ZodNullable<z.ZodString>;
                urgency: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".servicenow">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodObject<{
                category: z.ZodNullable<z.ZodString>;
                destIp: z.ZodNullable<z.ZodBoolean>;
                malwareHash: z.ZodNullable<z.ZodBoolean>;
                malwareUrl: z.ZodNullable<z.ZodBoolean>;
                priority: z.ZodNullable<z.ZodString>;
                sourceIp: z.ZodNullable<z.ZodBoolean>;
                subcategory: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".servicenow-sir">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodObject<{
                caseId: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".swimlane">;
        }, z.core.$strip>]>>;
        customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            type: z.ZodEnum<{
                text: "text";
                toggle: "toggle";
            }>;
            value: z.ZodUnion<readonly [z.ZodNullable<z.ZodString>, z.ZodBoolean]>;
        }, z.core.$strip>>>;
        description: z.ZodOptional<z.ZodString>;
        id: z.ZodString;
        settings: z.ZodOptional<z.ZodObject<{
            syncAlerts: z.ZodBoolean;
            extractObservables: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        severity: z.ZodOptional<z.ZodEnum<{
            critical: "critical";
            medium: "medium";
            high: "high";
            low: "low";
        }>>;
        status: z.ZodOptional<z.ZodEnum<{
            closed: "closed";
            open: "open";
            "in-progress": "in-progress";
        }>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        title: z.ZodOptional<z.ZodString>;
        closeReason: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            other: "other";
            duplicate: "duplicate";
            false_positive: "false_positive";
            true_positive: "true_positive";
            benign_positive: "benign_positive";
            automated_closure: "automated_closure";
        }>, z.ZodString]>>;
        version: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type UpdateCaseRequest = z.infer<typeof UpdateCaseRequest>;
export declare const String: z.ZodString;
export type String = z.infer<typeof String>;
export declare const StringArray: z.ZodArray<z.ZodString>;
export type StringArray = z.infer<typeof StringArray>;
export declare const CaseCategories: z.ZodArray<z.ZodString>;
export type CaseCategories = z.infer<typeof CaseCategories>;
export declare const Owners: z.ZodArray<z.ZodEnum<{
    cases: "cases";
    observability: "observability";
    securitySolution: "securitySolution";
}>>;
export type Owners = z.infer<typeof Owners>;
/**
 * The fields to perform the `simple_query_string` parsed query against.
 */
export declare const SearchFieldsType: z.ZodEnum<{
    description: "description";
    title: "title";
}>;
export type SearchFieldsType = z.infer<typeof SearchFieldsType>;
export type SearchFieldsTypeEnum = typeof SearchFieldsType.enum;
export declare const SearchFieldsTypeEnum: {
    description: "description";
    title: "title";
};
export declare const SearchFieldsTypeArray: z.ZodArray<z.ZodEnum<{
    description: "description";
    title: "title";
}>>;
export type SearchFieldsTypeArray = z.infer<typeof SearchFieldsTypeArray>;
/**
 * Counts of alerts, events, and user comments attached to a case.
 */
export declare const AttachmentTotals: z.ZodObject<{
    alerts: z.ZodNumber;
    events: z.ZodNumber;
    userComments: z.ZodNumber;
}, z.core.$strip>;
export type AttachmentTotals = z.infer<typeof AttachmentTotals>;
/**
  * Summary of a case returned when listing cases that contain a given alert. This is a subset of the full case response.

  */
export declare const RelatedCase: z.ZodObject<{
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
export type RelatedCase = z.infer<typeof RelatedCase>;
/**
 * Indicates whether a case is automatically closed when it is pushed to external systems (`close-by-pushing`) or not automatically closed (`close-by-user`).
 */
export declare const ClosureTypes: z.ZodEnum<{
    "close-by-user": "close-by-user";
    "close-by-pushing": "close-by-pushing";
}>;
export type ClosureTypes = z.infer<typeof ClosureTypes>;
export type ClosureTypesEnum = typeof ClosureTypes.enum;
export declare const ClosureTypesEnum: {
    "close-by-user": "close-by-user";
    "close-by-pushing": "close-by-pushing";
};
/**
 * The type of connector.
 */
export declare const ConnectorTypes: z.ZodEnum<{
    ".servicenow": ".servicenow";
    ".servicenow-sir": ".servicenow-sir";
    ".jira": ".jira";
    ".resilient": ".resilient";
    ".cases-webhook": ".cases-webhook";
    ".none": ".none";
    ".swimlane": ".swimlane";
}>;
export type ConnectorTypes = z.infer<typeof ConnectorTypes>;
export type ConnectorTypesEnum = typeof ConnectorTypes.enum;
export declare const ConnectorTypesEnum: {
    ".servicenow": ".servicenow";
    ".servicenow-sir": ".servicenow-sir";
    ".jira": ".jira";
    ".resilient": ".resilient";
    ".cases-webhook": ".cases-webhook";
    ".none": ".none";
    ".swimlane": ".swimlane";
};
/**
  * The words and phrases that help categorize templates. It can be an empty array.

  */
export declare const TemplateTags: z.ZodArray<z.ZodString>;
export type TemplateTags = z.infer<typeof TemplateTags>;
export declare const Templates: z.ZodArray<z.ZodObject<{
    caseFields: z.ZodOptional<z.ZodObject<{
        assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uid: z.ZodString;
        }, z.core.$strip>>>>;
        category: z.ZodOptional<z.ZodString>;
        connector: z.ZodOptional<z.ZodObject<{
            fields: z.ZodOptional<z.ZodNullable<z.ZodObject<{}, z.core.$strip>>>;
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            type: z.ZodOptional<z.ZodEnum<{
                ".servicenow": ".servicenow";
                ".servicenow-sir": ".servicenow-sir";
                ".jira": ".jira";
                ".resilient": ".resilient";
                ".cases-webhook": ".cases-webhook";
                ".none": ".none";
                ".swimlane": ".swimlane";
            }>>;
        }, z.core.$strip>>;
        customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
            key: z.ZodOptional<z.ZodString>;
            type: z.ZodOptional<z.ZodEnum<{
                text: "text";
                toggle: "toggle";
            }>>;
            value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodBoolean]>>;
        }, z.core.$strip>>>;
        description: z.ZodOptional<z.ZodString>;
        settings: z.ZodOptional<z.ZodObject<{
            syncAlerts: z.ZodBoolean;
            extractObservables: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        severity: z.ZodOptional<z.ZodEnum<{
            critical: "critical";
            medium: "medium";
            high: "high";
            low: "low";
        }>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        title: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    description: z.ZodOptional<z.ZodString>;
    key: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>>;
export type Templates = z.infer<typeof Templates>;
/**
 * External connection details, such as the closure type and default connector for cases.
 */
export declare const SetCaseConfigurationRequest: z.ZodObject<{
    closure_type: z.ZodEnum<{
        "close-by-user": "close-by-user";
        "close-by-pushing": "close-by-pushing";
    }>;
    connector: z.ZodObject<{
        fields: z.ZodNullable<z.ZodObject<{}, z.core.$strip>>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<{
            ".servicenow": ".servicenow";
            ".servicenow-sir": ".servicenow-sir";
            ".jira": ".jira";
            ".resilient": ".resilient";
            ".cases-webhook": ".cases-webhook";
            ".none": ".none";
            ".swimlane": ".swimlane";
        }>;
    }, z.core.$strip>;
    customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        defaultValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodBoolean]>>;
        key: z.ZodString;
        label: z.ZodString;
        required: z.ZodBoolean;
        type: z.ZodEnum<{
            text: "text";
            toggle: "toggle";
        }>;
    }, z.core.$strip>>>;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    templates: z.ZodOptional<z.ZodArray<z.ZodObject<{
        caseFields: z.ZodOptional<z.ZodObject<{
            assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                uid: z.ZodString;
            }, z.core.$strip>>>>;
            category: z.ZodOptional<z.ZodString>;
            connector: z.ZodOptional<z.ZodObject<{
                fields: z.ZodOptional<z.ZodNullable<z.ZodObject<{}, z.core.$strip>>>;
                id: z.ZodOptional<z.ZodString>;
                name: z.ZodOptional<z.ZodString>;
                type: z.ZodOptional<z.ZodEnum<{
                    ".servicenow": ".servicenow";
                    ".servicenow-sir": ".servicenow-sir";
                    ".jira": ".jira";
                    ".resilient": ".resilient";
                    ".cases-webhook": ".cases-webhook";
                    ".none": ".none";
                    ".swimlane": ".swimlane";
                }>>;
            }, z.core.$strip>>;
            customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
                key: z.ZodOptional<z.ZodString>;
                type: z.ZodOptional<z.ZodEnum<{
                    text: "text";
                    toggle: "toggle";
                }>>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodBoolean]>>;
            }, z.core.$strip>>>;
            description: z.ZodOptional<z.ZodString>;
            settings: z.ZodOptional<z.ZodObject<{
                syncAlerts: z.ZodBoolean;
                extractObservables: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            severity: z.ZodOptional<z.ZodEnum<{
                critical: "critical";
                medium: "medium";
                high: "high";
                low: "low";
            }>>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            title: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        description: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type SetCaseConfigurationRequest = z.infer<typeof SetCaseConfigurationRequest>;
/**
  * You can update settings such as the closure type, custom fields, templates, and the default connector for cases.

  */
export declare const UpdateCaseConfigurationRequest: z.ZodObject<{
    closure_type: z.ZodOptional<z.ZodEnum<{
        "close-by-user": "close-by-user";
        "close-by-pushing": "close-by-pushing";
    }>>;
    connector: z.ZodOptional<z.ZodObject<{
        fields: z.ZodNullable<z.ZodObject<{}, z.core.$strip>>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<{
            ".servicenow": ".servicenow";
            ".servicenow-sir": ".servicenow-sir";
            ".jira": ".jira";
            ".resilient": ".resilient";
            ".cases-webhook": ".cases-webhook";
            ".none": ".none";
            ".swimlane": ".swimlane";
        }>;
    }, z.core.$strip>>;
    customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        defaultValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodBoolean]>>;
        key: z.ZodString;
        label: z.ZodString;
        required: z.ZodBoolean;
        type: z.ZodEnum<{
            text: "text";
            toggle: "toggle";
        }>;
    }, z.core.$strip>>>;
    templates: z.ZodOptional<z.ZodArray<z.ZodObject<{
        caseFields: z.ZodOptional<z.ZodObject<{
            assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                uid: z.ZodString;
            }, z.core.$strip>>>>;
            category: z.ZodOptional<z.ZodString>;
            connector: z.ZodOptional<z.ZodObject<{
                fields: z.ZodOptional<z.ZodNullable<z.ZodObject<{}, z.core.$strip>>>;
                id: z.ZodOptional<z.ZodString>;
                name: z.ZodOptional<z.ZodString>;
                type: z.ZodOptional<z.ZodEnum<{
                    ".servicenow": ".servicenow";
                    ".servicenow-sir": ".servicenow-sir";
                    ".jira": ".jira";
                    ".resilient": ".resilient";
                    ".cases-webhook": ".cases-webhook";
                    ".none": ".none";
                    ".swimlane": ".swimlane";
                }>>;
            }, z.core.$strip>>;
            customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
                key: z.ZodOptional<z.ZodString>;
                type: z.ZodOptional<z.ZodEnum<{
                    text: "text";
                    toggle: "toggle";
                }>>;
                value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodBoolean]>>;
            }, z.core.$strip>>>;
            description: z.ZodOptional<z.ZodString>;
            settings: z.ZodOptional<z.ZodObject<{
                syncAlerts: z.ZodBoolean;
                extractObservables: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            severity: z.ZodOptional<z.ZodEnum<{
                critical: "critical";
                medium: "medium";
                high: "high";
                low: "low";
            }>>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            title: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        description: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>>;
    version: z.ZodString;
}, z.core.$strip>;
export type UpdateCaseConfigurationRequest = z.infer<typeof UpdateCaseConfigurationRequest>;
/**
  * Case details returned by the get case API. The comments property is not included in the response. Use the find case comments API to retrieve comments. totalComment reflects the actual number of user comments.

  */
export declare const CaseResponseGetCase: z.ZodObject<{
    assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
    }, z.core.$strip>>>>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    closed_at: z.ZodNullable<z.ZodString>;
    closed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    connector: z.ZodDiscriminatedUnion<[z.ZodObject<{
        fields: z.ZodNullable<z.ZodString>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".none">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodNullable<z.ZodString>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".cases-webhook">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            issueType: z.ZodNullable<z.ZodString>;
            parent: z.ZodNullable<z.ZodString>;
            priority: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".jira">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodNullable<z.ZodObject<{
            issueTypes: z.ZodArray<z.ZodString>;
            severityCode: z.ZodString;
        }, z.core.$strip>>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".resilient">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            category: z.ZodNullable<z.ZodString>;
            impact: z.ZodNullable<z.ZodString>;
            severity: z.ZodNullable<z.ZodString>;
            subcategory: z.ZodNullable<z.ZodString>;
            urgency: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".servicenow">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            category: z.ZodNullable<z.ZodString>;
            destIp: z.ZodNullable<z.ZodBoolean>;
            malwareHash: z.ZodNullable<z.ZodBoolean>;
            malwareUrl: z.ZodNullable<z.ZodBoolean>;
            priority: z.ZodNullable<z.ZodString>;
            sourceIp: z.ZodNullable<z.ZodBoolean>;
            subcategory: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".servicenow-sir">;
    }, z.core.$strip>, z.ZodObject<{
        fields: z.ZodObject<{
            caseId: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<".swimlane">;
    }, z.core.$strip>], "type">;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        key: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<{
            text: "text";
            toggle: "toggle";
        }>>;
        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodNullable<z.ZodString>, z.ZodBoolean]>>;
    }, z.core.$strip>>>;
    description: z.ZodString;
    duration: z.ZodNullable<z.ZodNumber>;
    external_service: z.ZodNullable<z.ZodObject<{
        connector_id: z.ZodOptional<z.ZodString>;
        connector_name: z.ZodOptional<z.ZodString>;
        external_id: z.ZodOptional<z.ZodString>;
        external_title: z.ZodOptional<z.ZodString>;
        external_url: z.ZodOptional<z.ZodString>;
        pushed_at: z.ZodOptional<z.ZodString>;
        pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    id: z.ZodString;
    incremental_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    observables: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        typeKey: z.ZodString;
        value: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    settings: z.ZodObject<{
        syncAlerts: z.ZodBoolean;
        extractObservables: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
    severity: z.ZodEnum<{
        critical: "critical";
        medium: "medium";
        high: "high";
        low: "low";
    }>;
    status: z.ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>;
    tags: z.ZodArray<z.ZodString>;
    title: z.ZodString;
    totalAlerts: z.ZodNumber;
    totalComment: z.ZodNumber;
    total_observables: z.ZodNullable<z.ZodNumber>;
    totalEvents: z.ZodOptional<z.ZodNumber>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    version: z.ZodString;
}, z.core.$strip>;
export type CaseResponseGetCase = z.infer<typeof CaseResponseGetCase>;
export declare const AlertResponseProperties: z.ZodObject<{
    attached_at: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
    index: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AlertResponseProperties = z.infer<typeof AlertResponseProperties>;
/**
  * The alert identifiers. It is required only when `type` is `alert`. You can use an array of strings to add multiple alerts to a case, provided that they all relate to the same rule; `index` must also be an array with the same length or number of elements. Adding multiple alerts in this manner is recommended rather than calling the API multiple times. This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.

  */
export declare const AlertIdentifiers: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
export type AlertIdentifiers = z.infer<typeof AlertIdentifiers>;
/**
  * The alert indices. It is required only when `type` is `alert`. If you are adding multiple alerts to a case, use an array of strings; the position of each index name in the array must match the position of the corresponding alert identifier in the `alertId` array.  This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.

  */
export declare const AlertIndices: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
export type AlertIndices = z.infer<typeof AlertIndices>;
/**
  * The rule that is associated with the alerts. It is required only when `type` is `alert`. This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.

  */
export declare const Rule: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Rule = z.infer<typeof Rule>;
/**
 * Defines properties for case comment requests when type is alert.
 */
export declare const AddAlertCommentRequestProperties: z.ZodObject<{
    alertId: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
    index: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    rule: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    type: z.ZodLiteral<"alert">;
}, z.core.$strip>;
export type AddAlertCommentRequestProperties = z.infer<typeof AddAlertCommentRequestProperties>;
/**
 * Defines properties for case comment requests when type is user.
 */
export declare const AddUserCommentRequestProperties: z.ZodObject<{
    comment: z.ZodString;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    type: z.ZodLiteral<"user">;
}, z.core.$strip>;
export type AddUserCommentRequestProperties = z.infer<typeof AddUserCommentRequestProperties>;
/**
 * The add comment to case API request body varies depending on whether you are adding an alert or a comment.
 */
export declare const AddCaseCommentRequest: z.ZodDiscriminatedUnion<[z.ZodObject<{
    alertId: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
    index: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    rule: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    type: z.ZodLiteral<"alert">;
}, z.core.$strip>, z.ZodObject<{
    comment: z.ZodString;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    type: z.ZodLiteral<"user">;
}, z.core.$strip>], "type">;
export type AddCaseCommentRequest = z.infer<typeof AddCaseCommentRequest>;
/**
 * Defines properties for case comment requests when type is alert.
 */
export declare const UpdateAlertCommentRequestProperties: z.ZodObject<{
    alertId: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
    id: z.ZodString;
    index: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    rule: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    type: z.ZodLiteral<"alert">;
    version: z.ZodString;
}, z.core.$strip>;
export type UpdateAlertCommentRequestProperties = z.infer<typeof UpdateAlertCommentRequestProperties>;
/**
 * Defines properties for case comment requests when type is user.
 */
export declare const UpdateUserCommentRequestProperties: z.ZodObject<{
    comment: z.ZodString;
    id: z.ZodString;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    type: z.ZodLiteral<"user">;
    version: z.ZodString;
}, z.core.$strip>;
export type UpdateUserCommentRequestProperties = z.infer<typeof UpdateUserCommentRequestProperties>;
/**
 * The update case comment API request body varies depending on whether you are updating an alert or a comment.
 */
export declare const UpdateCaseCommentRequest: z.ZodDiscriminatedUnion<[z.ZodObject<{
    alertId: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
    id: z.ZodString;
    index: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    rule: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    type: z.ZodLiteral<"alert">;
    version: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    comment: z.ZodString;
    id: z.ZodString;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    type: z.ZodLiteral<"user">;
    version: z.ZodString;
}, z.core.$strip>], "type">;
export type UpdateCaseCommentRequest = z.infer<typeof UpdateCaseCommentRequest>;
export declare const FindCommentsResponse: z.ZodObject<{
    comments: z.ZodArray<z.ZodObject<{
        comment: z.ZodOptional<z.ZodString>;
        created_at: z.ZodOptional<z.ZodString>;
        created_by: z.ZodOptional<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        id: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        pushed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"user">;
        updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updated_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        version: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    page: z.ZodNumber;
    per_page: z.ZodNumber;
    total: z.ZodNumber;
}, z.core.$strip>;
export type FindCommentsResponse = z.infer<typeof FindCommentsResponse>;
export declare const Actions: z.ZodEnum<{
    update: "update";
    create: "create";
    delete: "delete";
    add: "add";
    push_to_service: "push_to_service";
}>;
export type Actions = z.infer<typeof Actions>;
export type ActionsEnum = typeof Actions.enum;
export declare const ActionsEnum: {
    update: "update";
    create: "create";
    delete: "delete";
    add: "add";
    push_to_service: "push_to_service";
};
export declare const PayloadAlertComment: z.ZodObject<{
    comment: z.ZodOptional<z.ZodObject<{
        alertId: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
        index: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
        owner: z.ZodOptional<z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        rule: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        type: z.ZodOptional<z.ZodLiteral<"alert">>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PayloadAlertComment = z.infer<typeof PayloadAlertComment>;
export declare const PayloadAssignees: z.ZodObject<{
    assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
    }, z.core.$strip>>>>;
}, z.core.$strip>;
export type PayloadAssignees = z.infer<typeof PayloadAssignees>;
export declare const PayloadConnector: z.ZodObject<{
    connector: z.ZodOptional<z.ZodObject<{
        fields: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            caseId: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodString>;
            destIp: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            impact: z.ZodOptional<z.ZodString>;
            issueType: z.ZodOptional<z.ZodString>;
            issueTypes: z.ZodOptional<z.ZodArray<z.ZodString>>;
            malwareHash: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            malwareUrl: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            parent: z.ZodOptional<z.ZodString>;
            priority: z.ZodOptional<z.ZodString>;
            severity: z.ZodOptional<z.ZodString>;
            severityCode: z.ZodOptional<z.ZodString>;
            sourceIp: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            subcategory: z.ZodOptional<z.ZodString>;
            urgency: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<{
            ".servicenow": ".servicenow";
            ".servicenow-sir": ".servicenow-sir";
            ".jira": ".jira";
            ".resilient": ".resilient";
            ".cases-webhook": ".cases-webhook";
            ".none": ".none";
            ".swimlane": ".swimlane";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PayloadConnector = z.infer<typeof PayloadConnector>;
export declare const PayloadCreateCase: z.ZodObject<{
    assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
    }, z.core.$strip>>>>;
    connector: z.ZodOptional<z.ZodObject<{
        fields: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            caseId: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodString>;
            destIp: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            impact: z.ZodOptional<z.ZodString>;
            issueType: z.ZodOptional<z.ZodString>;
            issueTypes: z.ZodOptional<z.ZodArray<z.ZodString>>;
            malwareHash: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            malwareUrl: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            parent: z.ZodOptional<z.ZodString>;
            priority: z.ZodOptional<z.ZodString>;
            severity: z.ZodOptional<z.ZodString>;
            severityCode: z.ZodOptional<z.ZodString>;
            sourceIp: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            subcategory: z.ZodOptional<z.ZodString>;
            urgency: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<{
            ".servicenow": ".servicenow";
            ".servicenow-sir": ".servicenow-sir";
            ".jira": ".jira";
            ".resilient": ".resilient";
            ".cases-webhook": ".cases-webhook";
            ".none": ".none";
            ".swimlane": ".swimlane";
        }>>;
    }, z.core.$strip>>;
    description: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>>;
    settings: z.ZodOptional<z.ZodObject<{
        syncAlerts: z.ZodBoolean;
        extractObservables: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    severity: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        medium: "medium";
        high: "high";
        low: "low";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    title: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PayloadCreateCase = z.infer<typeof PayloadCreateCase>;
/**
 * If the `action` is `delete` and the `type` is `delete_case`, the payload is nullable.
 */
export declare const PayloadDelete: z.ZodNullable<z.ZodObject<{}, z.core.$strip>>;
export type PayloadDelete = z.infer<typeof PayloadDelete>;
export declare const PayloadDescription: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PayloadDescription = z.infer<typeof PayloadDescription>;
export declare const PayloadPushed: z.ZodObject<{
    externalService: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        connector_id: z.ZodOptional<z.ZodString>;
        connector_name: z.ZodOptional<z.ZodString>;
        external_id: z.ZodOptional<z.ZodString>;
        external_title: z.ZodOptional<z.ZodString>;
        external_url: z.ZodOptional<z.ZodString>;
        pushed_at: z.ZodOptional<z.ZodString>;
        pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type PayloadPushed = z.infer<typeof PayloadPushed>;
export declare const PayloadSettings: z.ZodObject<{
    settings: z.ZodOptional<z.ZodObject<{
        syncAlerts: z.ZodBoolean;
        extractObservables: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PayloadSettings = z.infer<typeof PayloadSettings>;
export declare const PayloadSeverity: z.ZodObject<{
    severity: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        medium: "medium";
        high: "high";
        low: "low";
    }>>;
}, z.core.$strip>;
export type PayloadSeverity = z.infer<typeof PayloadSeverity>;
export declare const PayloadStatus: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>>;
}, z.core.$strip>;
export type PayloadStatus = z.infer<typeof PayloadStatus>;
export declare const PayloadTags: z.ZodObject<{
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type PayloadTags = z.infer<typeof PayloadTags>;
export declare const PayloadTitle: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PayloadTitle = z.infer<typeof PayloadTitle>;
export declare const PayloadUserComment: z.ZodObject<{
    comment: z.ZodOptional<z.ZodObject<{
        comment: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        type: z.ZodOptional<z.ZodLiteral<"user">>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PayloadUserComment = z.infer<typeof PayloadUserComment>;
export declare const UserActionsFindResponseProperties: z.ZodObject<{
    action: z.ZodEnum<{
        update: "update";
        create: "create";
        delete: "delete";
        add: "add";
        push_to_service: "push_to_service";
    }>;
    comment_id: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodNullable<z.ZodString>;
        full_name: z.ZodNullable<z.ZodString>;
        username: z.ZodNullable<z.ZodString>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    id: z.ZodString;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    payload: z.ZodUnion<readonly [z.ZodObject<{
        comment: z.ZodOptional<z.ZodObject<{
            alertId: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
            index: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
            owner: z.ZodOptional<z.ZodEnum<{
                cases: "cases";
                observability: "observability";
                securitySolution: "securitySolution";
            }>>;
            rule: z.ZodOptional<z.ZodObject<{
                id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>>;
            type: z.ZodOptional<z.ZodLiteral<"alert">>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uid: z.ZodString;
        }, z.core.$strip>>>>;
    }, z.core.$strip>, z.ZodObject<{
        connector: z.ZodOptional<z.ZodObject<{
            fields: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                caseId: z.ZodOptional<z.ZodString>;
                category: z.ZodOptional<z.ZodString>;
                destIp: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
                impact: z.ZodOptional<z.ZodString>;
                issueType: z.ZodOptional<z.ZodString>;
                issueTypes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                malwareHash: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
                malwareUrl: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
                parent: z.ZodOptional<z.ZodString>;
                priority: z.ZodOptional<z.ZodString>;
                severity: z.ZodOptional<z.ZodString>;
                severityCode: z.ZodOptional<z.ZodString>;
                sourceIp: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
                subcategory: z.ZodOptional<z.ZodString>;
                urgency: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            type: z.ZodOptional<z.ZodEnum<{
                ".servicenow": ".servicenow";
                ".servicenow-sir": ".servicenow-sir";
                ".jira": ".jira";
                ".resilient": ".resilient";
                ".cases-webhook": ".cases-webhook";
                ".none": ".none";
                ".swimlane": ".swimlane";
            }>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uid: z.ZodString;
        }, z.core.$strip>>>>;
        connector: z.ZodOptional<z.ZodObject<{
            fields: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                caseId: z.ZodOptional<z.ZodString>;
                category: z.ZodOptional<z.ZodString>;
                destIp: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
                impact: z.ZodOptional<z.ZodString>;
                issueType: z.ZodOptional<z.ZodString>;
                issueTypes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                malwareHash: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
                malwareUrl: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
                parent: z.ZodOptional<z.ZodString>;
                priority: z.ZodOptional<z.ZodString>;
                severity: z.ZodOptional<z.ZodString>;
                severityCode: z.ZodOptional<z.ZodString>;
                sourceIp: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
                subcategory: z.ZodOptional<z.ZodString>;
                urgency: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            type: z.ZodOptional<z.ZodEnum<{
                ".servicenow": ".servicenow";
                ".servicenow-sir": ".servicenow-sir";
                ".jira": ".jira";
                ".resilient": ".resilient";
                ".cases-webhook": ".cases-webhook";
                ".none": ".none";
                ".swimlane": ".swimlane";
            }>>;
        }, z.core.$strip>>;
        description: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        settings: z.ZodOptional<z.ZodObject<{
            syncAlerts: z.ZodBoolean;
            extractObservables: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        severity: z.ZodOptional<z.ZodEnum<{
            critical: "critical";
            medium: "medium";
            high: "high";
            low: "low";
        }>>;
        status: z.ZodOptional<z.ZodEnum<{
            closed: "closed";
            open: "open";
            "in-progress": "in-progress";
        }>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        title: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodNullable<z.ZodObject<{}, z.core.$strip>>, z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        externalService: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            connector_id: z.ZodOptional<z.ZodString>;
            connector_name: z.ZodOptional<z.ZodString>;
            external_id: z.ZodOptional<z.ZodString>;
            external_title: z.ZodOptional<z.ZodString>;
            external_url: z.ZodOptional<z.ZodString>;
            pushed_at: z.ZodOptional<z.ZodString>;
            pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                profile_uid: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodObject<{
        settings: z.ZodOptional<z.ZodObject<{
            syncAlerts: z.ZodBoolean;
            extractObservables: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        severity: z.ZodOptional<z.ZodEnum<{
            critical: "critical";
            medium: "medium";
            high: "high";
            low: "low";
        }>>;
    }, z.core.$strip>, z.ZodObject<{
        status: z.ZodOptional<z.ZodEnum<{
            closed: "closed";
            open: "open";
            "in-progress": "in-progress";
        }>>;
    }, z.core.$strip>, z.ZodObject<{
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>, z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        comment: z.ZodOptional<z.ZodObject<{
            comment: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodEnum<{
                cases: "cases";
                observability: "observability";
                securitySolution: "securitySolution";
            }>>;
            type: z.ZodOptional<z.ZodLiteral<"user">>;
        }, z.core.$strip>>;
    }, z.core.$strip>]>;
    version: z.ZodString;
    type: z.ZodEnum<{
        tags: "tags";
        status: "status";
        description: "description";
        connector: "connector";
        settings: "settings";
        title: "title";
        severity: "severity";
        category: "category";
        comment: "comment";
        assignees: "assignees";
        observables: "observables";
        customFields: "customFields";
        extended_fields: "extended_fields";
        pushed: "pushed";
        create_case: "create_case";
        delete_case: "delete_case";
    }>;
}, z.core.$strip>;
export type UserActionsFindResponseProperties = z.infer<typeof UserActionsFindResponseProperties>;
/**
 * Defines the file that will be attached to the case. Optional parameters will be generated automatically from the file metadata if not defined.
 */
export declare const AddCaseFileRequest: z.ZodObject<{
    file: z.ZodString;
    filename: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AddCaseFileRequest = z.infer<typeof AddCaseFileRequest>;
