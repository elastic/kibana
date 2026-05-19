import * as rt from 'io-ts';
import type { CaseUserActionInjectedIdsRt } from '../../domain/user_action/v1';
import type { AttachmentsV2 } from '../../domain';
export type UserActionWithResponse<T> = T & {
    id: string;
    version: string;
} & rt.TypeOf<typeof CaseUserActionInjectedIdsRt>;
/**
 * User actions stats API
 */
export declare const CaseUserActionStatsRt: rt.ExactC<rt.TypeC<{
    total: rt.NumberC;
    total_deletions: rt.NumberC;
    total_comments: rt.NumberC;
    total_comment_deletions: rt.NumberC;
    total_comment_creations: rt.NumberC;
    total_hidden_comment_updates: rt.NumberC;
    total_other_actions: rt.NumberC;
    total_other_action_deletions: rt.NumberC;
}>>;
export type CaseUserActionStatsResponse = rt.TypeOf<typeof CaseUserActionStatsRt>;
export declare const CaseUserActionStatsResponseRt: rt.ExactC<rt.TypeC<{
    total: rt.NumberC;
    total_deletions: rt.NumberC;
    total_comments: rt.NumberC;
    total_comment_deletions: rt.NumberC;
    total_comment_creations: rt.NumberC;
    total_hidden_comment_updates: rt.NumberC;
    total_other_actions: rt.NumberC;
    total_other_action_deletions: rt.NumberC;
}>>;
/**
 * Deprecated APIs
 */
export declare const CaseUserActionDeprecatedResponseRt: rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"description">;
    payload: rt.ExactC<rt.TypeC<{
        description: rt.StringC;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"tags">;
    payload: rt.ExactC<rt.TypeC<{
        tags: rt.ArrayC<rt.StringC>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"title">;
    payload: rt.ExactC<rt.TypeC<{
        title: rt.StringC;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"settings">;
    payload: rt.ExactC<rt.TypeC<{
        settings: rt.PartialC<{
            syncAlerts: rt.BooleanC;
            extractObservables: rt.BooleanC;
        }>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"status">;
    payload: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
    }>, rt.PartialC<{
        closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
        syncedAlertCount: rt.NumberC;
    }>]>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"severity">;
    payload: rt.ExactC<rt.TypeC<{
        severity: rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"assignees">;
    payload: rt.ExactC<rt.TypeC<{
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"delete_case">;
    payload: rt.ExactC<rt.TypeC<{}>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"category">;
    payload: rt.ExactC<rt.TypeC<{
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"customFields">;
    payload: rt.ExactC<rt.TypeC<{
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
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"observables">;
    payload: rt.ExactC<rt.TypeC<{
        observables: rt.ExactC<rt.TypeC<{
            count: rt.NumberC;
            actionType: rt.UnionC<[rt.LiteralC<"add">, rt.LiteralC<"delete">, rt.LiteralC<"update">]>;
        }>>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"extended_fields">;
    payload: rt.ExactC<rt.TypeC<{
        extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"template">;
    payload: rt.ExactC<rt.TypeC<{
        template: rt.UnionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.NumberC;
        }>>, rt.NullC]>;
    }>>;
}>>]>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"comment">;
    payload: rt.ExactC<rt.TypeC<{
        comment: rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
            comment: rt.Type<string, string, unknown>;
            type: rt.LiteralC<import("../../domain").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.actions>;
            comment: rt.Type<string, string, unknown>;
            actions: rt.ExactC<rt.TypeC<{
                targets: rt.ArrayC<rt.ExactC<rt.TypeC<{
                    hostname: rt.StringC;
                    endpointId: rt.StringC;
                }>>>;
                type: rt.StringC;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
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
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.persistableState>;
            owner: rt.StringC;
            persistableStateAttachmentTypeId: rt.StringC;
            persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        }>>]>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
        }>>]>]>]>;
    }>>;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"create_case">;
}>>, rt.ExactC<rt.TypeC<{
    payload: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
    }>>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
        description: rt.StringC;
        status: rt.StringC;
        severity: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
        title: rt.StringC;
        settings: rt.PartialC<{
            syncAlerts: rt.BooleanC;
            extractObservables: rt.BooleanC;
        }>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
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
    }>>]>]>;
}>>]>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"connector">;
    payload: rt.ExactC<rt.TypeC<{
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
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"pushed">;
    payload: rt.ExactC<rt.TypeC<{
        externalService: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
        }>>]>;
    }>>;
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
    action: rt.KeyofC<{
        readonly add: "add";
        readonly create: "create";
        readonly delete: "delete";
        readonly update: "update";
        readonly push_to_service: "push_to_service";
    }>;
}>>]>, rt.ExactC<rt.TypeC<{
    action_id: rt.StringC;
    case_id: rt.StringC;
    comment_id: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>;
export declare const CaseUserActionsDeprecatedResponseRt: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"description">;
    payload: rt.ExactC<rt.TypeC<{
        description: rt.StringC;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"tags">;
    payload: rt.ExactC<rt.TypeC<{
        tags: rt.ArrayC<rt.StringC>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"title">;
    payload: rt.ExactC<rt.TypeC<{
        title: rt.StringC;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"settings">;
    payload: rt.ExactC<rt.TypeC<{
        settings: rt.PartialC<{
            syncAlerts: rt.BooleanC;
            extractObservables: rt.BooleanC;
        }>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"status">;
    payload: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
    }>, rt.PartialC<{
        closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
        syncedAlertCount: rt.NumberC;
    }>]>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"severity">;
    payload: rt.ExactC<rt.TypeC<{
        severity: rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"assignees">;
    payload: rt.ExactC<rt.TypeC<{
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"delete_case">;
    payload: rt.ExactC<rt.TypeC<{}>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"category">;
    payload: rt.ExactC<rt.TypeC<{
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"customFields">;
    payload: rt.ExactC<rt.TypeC<{
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
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"observables">;
    payload: rt.ExactC<rt.TypeC<{
        observables: rt.ExactC<rt.TypeC<{
            count: rt.NumberC;
            actionType: rt.UnionC<[rt.LiteralC<"add">, rt.LiteralC<"delete">, rt.LiteralC<"update">]>;
        }>>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"extended_fields">;
    payload: rt.ExactC<rt.TypeC<{
        extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"template">;
    payload: rt.ExactC<rt.TypeC<{
        template: rt.UnionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
            version: rt.NumberC;
        }>>, rt.NullC]>;
    }>>;
}>>]>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"comment">;
    payload: rt.ExactC<rt.TypeC<{
        comment: rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
            comment: rt.Type<string, string, unknown>;
            type: rt.LiteralC<import("../../domain").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.actions>;
            comment: rt.Type<string, string, unknown>;
            actions: rt.ExactC<rt.TypeC<{
                targets: rt.ArrayC<rt.ExactC<rt.TypeC<{
                    hostname: rt.StringC;
                    endpointId: rt.StringC;
                }>>>;
                type: rt.StringC;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
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
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain").AttachmentType.persistableState>;
            owner: rt.StringC;
            persistableStateAttachmentTypeId: rt.StringC;
            persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        }>>]>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
        }>>]>]>]>;
    }>>;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"create_case">;
}>>, rt.ExactC<rt.TypeC<{
    payload: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
    }>>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
        description: rt.StringC;
        status: rt.StringC;
        severity: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
        title: rt.StringC;
        settings: rt.PartialC<{
            syncAlerts: rt.BooleanC;
            extractObservables: rt.BooleanC;
        }>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
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
    }>>]>]>;
}>>]>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"connector">;
    payload: rt.ExactC<rt.TypeC<{
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
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"pushed">;
    payload: rt.ExactC<rt.TypeC<{
        externalService: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
        }>>]>;
    }>>;
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
    action: rt.KeyofC<{
        readonly add: "add";
        readonly create: "create";
        readonly delete: "delete";
        readonly update: "update";
        readonly push_to_service: "push_to_service";
    }>;
}>>]>, rt.ExactC<rt.TypeC<{
    action_id: rt.StringC;
    case_id: rt.StringC;
    comment_id: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>>;
export type CaseUserActionsDeprecatedResponse = rt.TypeOf<typeof CaseUserActionsDeprecatedResponseRt>;
export type CaseUserActionDeprecatedResponse = rt.TypeOf<typeof CaseUserActionDeprecatedResponseRt>;
declare const UserActionFindRequestTypesRt: rt.KeyofC<{
    readonly action: "action";
    readonly alert: "alert";
    readonly user: "user";
    readonly attachment: "attachment";
    readonly assignees: "assignees";
    readonly comment: "comment";
    readonly connector: "connector";
    readonly description: "description";
    readonly pushed: "pushed";
    readonly tags: "tags";
    readonly title: "title";
    readonly status: "status";
    readonly settings: "settings";
    readonly severity: "severity";
    readonly create_case: "create_case";
    readonly delete_case: "delete_case";
    readonly category: "category";
    readonly customFields: "customFields";
    readonly observables: "observables";
    readonly extended_fields: "extended_fields";
    readonly template: "template";
}>;
export type UserActionFindRequestTypes = rt.TypeOf<typeof UserActionFindRequestTypesRt>;
export declare const UserActionFindRequestRt: rt.IntersectionC<[rt.ExactC<rt.PartialC<{
    types: rt.ArrayC<rt.KeyofC<{
        readonly action: "action";
        readonly alert: "alert";
        readonly user: "user";
        readonly attachment: "attachment";
        readonly assignees: "assignees";
        readonly comment: "comment";
        readonly connector: "connector";
        readonly description: "description";
        readonly pushed: "pushed";
        readonly tags: "tags";
        readonly title: "title";
        readonly status: "status";
        readonly settings: "settings";
        readonly severity: "severity";
        readonly create_case: "create_case";
        readonly delete_case: "delete_case";
        readonly category: "category";
        readonly customFields: "customFields";
        readonly observables: "observables";
        readonly extended_fields: "extended_fields";
        readonly template: "template";
    }>>;
    sortOrder: rt.UnionC<[rt.LiteralC<"desc">, rt.LiteralC<"asc">]>;
}>>, rt.PartialType<undefined, Partial<import("../../../schema/types").Pagination>, Partial<import("../../../schema/types").Pagination>, unknown>]>;
export type UserActionFindRequest = rt.TypeOf<typeof UserActionFindRequestRt>;
export declare const UserActionFindResponseRt: rt.ExactC<rt.TypeC<{
    userActions: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"description">;
        payload: rt.ExactC<rt.TypeC<{
            description: rt.StringC;
        }>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"tags">;
        payload: rt.ExactC<rt.TypeC<{
            tags: rt.ArrayC<rt.StringC>;
        }>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"title">;
        payload: rt.ExactC<rt.TypeC<{
            title: rt.StringC;
        }>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"settings">;
        payload: rt.ExactC<rt.TypeC<{
            settings: rt.PartialC<{
                syncAlerts: rt.BooleanC;
                extractObservables: rt.BooleanC;
            }>;
        }>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"status">;
        payload: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
            status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
        }>, rt.PartialC<{
            closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
            syncedAlertCount: rt.NumberC;
        }>]>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"severity">;
        payload: rt.ExactC<rt.TypeC<{
            severity: rt.UnionC<[rt.LiteralC<import("../../domain").CaseSeverity.LOW>, rt.LiteralC<import("../../domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../domain").CaseSeverity.CRITICAL>]>;
        }>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"assignees">;
        payload: rt.ExactC<rt.TypeC<{
            assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
                uid: rt.StringC;
            }>>>;
        }>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"delete_case">;
        payload: rt.ExactC<rt.TypeC<{}>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"category">;
        payload: rt.ExactC<rt.TypeC<{
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"customFields">;
        payload: rt.ExactC<rt.TypeC<{
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
        }>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"observables">;
        payload: rt.ExactC<rt.TypeC<{
            observables: rt.ExactC<rt.TypeC<{
                count: rt.NumberC;
                actionType: rt.UnionC<[rt.LiteralC<"add">, rt.LiteralC<"delete">, rt.LiteralC<"update">]>;
            }>>;
        }>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"extended_fields">;
        payload: rt.ExactC<rt.TypeC<{
            extended_fields: rt.RecordC<rt.StringC, rt.StringC>;
        }>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"template">;
        payload: rt.ExactC<rt.TypeC<{
            template: rt.UnionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
                version: rt.NumberC;
            }>>, rt.NullC]>;
        }>>;
    }>>]>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"comment">;
        payload: rt.ExactC<rt.TypeC<{
            comment: rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
                comment: rt.Type<string, string, unknown>;
                type: rt.LiteralC<import("../../domain").AttachmentType.user>;
                owner: rt.StringC;
            }>>, rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").AttachmentType.event>;
                eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
                index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
                owner: rt.StringC;
            }>>, rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").AttachmentType.alert>;
                alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
                index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
                rule: rt.ExactC<rt.TypeC<{
                    id: rt.UnionC<[rt.StringC, rt.NullC]>;
                    name: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>;
                owner: rt.StringC;
            }>>, rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").AttachmentType.actions>;
                comment: rt.Type<string, string, unknown>;
                actions: rt.ExactC<rt.TypeC<{
                    targets: rt.ArrayC<rt.ExactC<rt.TypeC<{
                        hostname: rt.StringC;
                        endpointId: rt.StringC;
                    }>>>;
                    type: rt.StringC;
                }>>;
                owner: rt.StringC;
            }>>, rt.ExactC<rt.TypeC<{
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
            }>>, rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../domain").AttachmentType.persistableState>;
                owner: rt.StringC;
                persistableStateAttachmentTypeId: rt.StringC;
                persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
            }>>]>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
            }>>]>]>]>;
        }>>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"create_case">;
    }>>, rt.ExactC<rt.TypeC<{
        payload: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
        }>>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
                uid: rt.StringC;
            }>>>;
            description: rt.StringC;
            status: rt.StringC;
            severity: rt.StringC;
            tags: rt.ArrayC<rt.StringC>;
            title: rt.StringC;
            settings: rt.PartialC<{
                syncAlerts: rt.BooleanC;
                extractObservables: rt.BooleanC;
            }>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.PartialC<{
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
        }>>]>]>;
    }>>]>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"connector">;
        payload: rt.ExactC<rt.TypeC<{
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
        }>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"pushed">;
        payload: rt.ExactC<rt.TypeC<{
            externalService: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
            }>>]>;
        }>>;
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
        action: rt.KeyofC<{
            readonly add: "add";
            readonly create: "create";
            readonly delete: "delete";
            readonly update: "update";
            readonly push_to_service: "push_to_service";
        }>;
    }>>]>, rt.ExactC<rt.TypeC<{
        comment_id: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.ExactC<rt.TypeC<{
        id: rt.StringC;
        version: rt.StringC;
    }>>]>>;
    page: rt.NumberC;
    perPage: rt.NumberC;
    total: rt.NumberC;
}>>;
export type UserActionFindResponse = rt.TypeOf<typeof UserActionFindResponseRt>;
export interface UserActionInternalFindResponse extends UserActionFindResponse {
    latestAttachments: AttachmentsV2;
}
export {};
