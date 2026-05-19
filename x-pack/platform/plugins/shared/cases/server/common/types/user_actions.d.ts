import type { SavedObject } from '@kbn/core/server';
import type { UserActionAttributes } from '../../../common/types/domain';
import type { User } from './user';
interface UserActionCommonPersistedAttributes {
    action: string;
    created_at: string;
    created_by: User;
    owner: string;
}
export interface UserActionPersistedAttributes extends UserActionCommonPersistedAttributes {
    type: string;
    payload: Record<string, unknown>;
}
export declare const UserActionTransformedAttributesRt: import("io-ts").IntersectionC<[import("io-ts").IntersectionC<[import("io-ts").UnionC<[import("io-ts").UnionC<[import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"description">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        description: import("io-ts").StringC;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"tags">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        tags: import("io-ts").ArrayC<import("io-ts").StringC>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"title">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        title: import("io-ts").StringC;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"settings">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        settings: import("io-ts").PartialC<{
            syncAlerts: import("io-ts").BooleanC;
            extractObservables: import("io-ts").BooleanC;
        }>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"status">;
    payload: import("io-ts").ExactC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
        status: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, import("io-ts").LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, import("io-ts").LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
    }>, import("io-ts").PartialC<{
        closeReason: import("io-ts").UnionC<[import("io-ts").UnionC<[import("io-ts").LiteralC<"false_positive">, import("io-ts").LiteralC<"duplicate">, import("io-ts").LiteralC<"true_positive">, import("io-ts").LiteralC<"benign_positive">, import("io-ts").LiteralC<"automated_closure">, import("io-ts").LiteralC<"other">]>, import("io-ts").StringC]>;
        syncedAlertCount: import("io-ts").NumberC;
    }>]>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"severity">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        severity: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.LOW>, import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.MEDIUM>, import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.HIGH>, import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.CRITICAL>]>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"assignees">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        assignees: import("io-ts").ArrayC<import("io-ts").ExactC<import("io-ts").TypeC<{
            uid: import("io-ts").StringC;
        }>>>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"delete_case">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{}>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"category">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"customFields">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        customFields: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.TEXT>;
            value: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.TOGGLE>;
            value: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.NUMBER>;
            value: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
        }>>]>>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"observables">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        observables: import("io-ts").ExactC<import("io-ts").TypeC<{
            count: import("io-ts").NumberC;
            actionType: import("io-ts").UnionC<[import("io-ts").LiteralC<"add">, import("io-ts").LiteralC<"delete">, import("io-ts").LiteralC<"update">]>;
        }>>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"extended_fields">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        extended_fields: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").StringC>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"template">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        template: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            id: import("io-ts").StringC;
            version: import("io-ts").NumberC;
        }>>, import("io-ts").NullC]>;
    }>>;
}>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"comment">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        comment: import("io-ts").UnionC<[import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            comment: import("io-ts").Type<string, string, unknown>;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.user>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.event>;
            eventId: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
            index: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.alert>;
            alertId: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
            index: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
            rule: import("io-ts").ExactC<import("io-ts").TypeC<{
                id: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                name: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.actions>;
            comment: import("io-ts").Type<string, string, unknown>;
            actions: import("io-ts").ExactC<import("io-ts").TypeC<{
                targets: import("io-ts").ArrayC<import("io-ts").ExactC<import("io-ts").TypeC<{
                    hostname: import("io-ts").StringC;
                    endpointId: import("io-ts").StringC;
                }>>>;
                type: import("io-ts").StringC;
            }>>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            externalReferenceId: import("io-ts").StringC;
            externalReferenceStorage: import("io-ts").ExactC<import("io-ts").TypeC<{
                type: import("io-ts").LiteralC<import("../../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc>;
            }>>;
            externalReferenceAttachmentTypeId: import("io-ts").StringC;
            externalReferenceMetadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.externalReference>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            externalReferenceId: import("io-ts").StringC;
            externalReferenceStorage: import("io-ts").ExactC<import("io-ts").TypeC<{
                type: import("io-ts").LiteralC<import("../../../common/types/domain").ExternalReferenceStorageType.savedObject>;
                soType: import("io-ts").StringC;
            }>>;
            externalReferenceAttachmentTypeId: import("io-ts").StringC;
            externalReferenceMetadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.externalReference>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.persistableState>;
            owner: import("io-ts").StringC;
            persistableStateAttachmentTypeId: import("io-ts").StringC;
            persistableStateAttachmentState: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        }>>]>, import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").StringC;
            attachmentId: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").ArrayC<import("io-ts").StringC>]>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            data: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            metadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").StringC;
            data: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            metadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>]>]>;
    }>>;
}>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"create_case">;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    payload: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        connector: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            id: import("io-ts").StringC;
        }>>, import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.casesWebhook>;
            fields: import("io-ts").NullC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.jira>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                issueType: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                priority: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                parent: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                otherFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.none>;
            fields: import("io-ts").NullC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.resilient>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                incidentTypes: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").NullC]>;
                severityCode: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowITSM>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                impact: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                severity: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                urgency: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                subcategory: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowSIR>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                destIp: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                malwareHash: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                malwareUrl: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                priority: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                sourceIp: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                subcategory: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.swimlane>;
            fields: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                caseId: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.theHive>;
            fields: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                tlp: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
            }>>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>]>]>;
    }>>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        assignees: import("io-ts").ArrayC<import("io-ts").ExactC<import("io-ts").TypeC<{
            uid: import("io-ts").StringC;
        }>>>;
        description: import("io-ts").StringC;
        status: import("io-ts").StringC;
        severity: import("io-ts").StringC;
        tags: import("io-ts").ArrayC<import("io-ts").StringC>;
        title: import("io-ts").StringC;
        settings: import("io-ts").PartialC<{
            syncAlerts: import("io-ts").BooleanC;
            extractObservables: import("io-ts").BooleanC;
        }>;
        owner: import("io-ts").StringC;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        customFields: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.TEXT>;
            value: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.TOGGLE>;
            value: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.NUMBER>;
            value: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
        }>>]>>;
    }>>]>]>;
}>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"connector">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        connector: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            id: import("io-ts").StringC;
        }>>, import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.casesWebhook>;
            fields: import("io-ts").NullC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.jira>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                issueType: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                priority: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                parent: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                otherFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.none>;
            fields: import("io-ts").NullC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.resilient>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                incidentTypes: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").NullC]>;
                severityCode: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowITSM>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                impact: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                severity: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                urgency: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                subcategory: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowSIR>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                destIp: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                malwareHash: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                malwareUrl: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                priority: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                sourceIp: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                subcategory: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.swimlane>;
            fields: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                caseId: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.theHive>;
            fields: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                tlp: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
            }>>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>]>]>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"pushed">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        externalService: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            connector_id: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            connector_name: import("io-ts").StringC;
            external_id: import("io-ts").StringC;
            external_title: import("io-ts").StringC;
            external_url: import("io-ts").StringC;
            pushed_at: import("io-ts").StringC;
            pushed_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
                full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
                username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                profile_uid: import("io-ts").StringC;
            }>>]>;
        }>>]>;
    }>>;
}>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
    created_at: import("io-ts").StringC;
    created_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>;
    owner: import("io-ts").StringC;
    action: import("io-ts").KeyofC<{
        readonly add: "add";
        readonly create: "create";
        readonly delete: "delete";
        readonly update: "update";
        readonly push_to_service: "push_to_service";
    }>;
}>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
    comment_id: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
}>>]>;
export declare const UserActionPersistedAttributesRt: import("io-ts").IntersectionC<[import("io-ts").UnionC<[import("io-ts").UnionC<[import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"description">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        description: import("io-ts").StringC;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"tags">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        tags: import("io-ts").ArrayC<import("io-ts").StringC>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"title">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        title: import("io-ts").StringC;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"settings">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        settings: import("io-ts").PartialC<{
            syncAlerts: import("io-ts").BooleanC;
            extractObservables: import("io-ts").BooleanC;
        }>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"status">;
    payload: import("io-ts").ExactC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
        status: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, import("io-ts").LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, import("io-ts").LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
    }>, import("io-ts").PartialC<{
        closeReason: import("io-ts").UnionC<[import("io-ts").UnionC<[import("io-ts").LiteralC<"false_positive">, import("io-ts").LiteralC<"duplicate">, import("io-ts").LiteralC<"true_positive">, import("io-ts").LiteralC<"benign_positive">, import("io-ts").LiteralC<"automated_closure">, import("io-ts").LiteralC<"other">]>, import("io-ts").StringC]>;
        syncedAlertCount: import("io-ts").NumberC;
    }>]>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"severity">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        severity: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.LOW>, import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.MEDIUM>, import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.HIGH>, import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.CRITICAL>]>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"assignees">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        assignees: import("io-ts").ArrayC<import("io-ts").ExactC<import("io-ts").TypeC<{
            uid: import("io-ts").StringC;
        }>>>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"delete_case">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{}>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"category">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"customFields">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        customFields: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.TEXT>;
            value: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.TOGGLE>;
            value: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.NUMBER>;
            value: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
        }>>]>>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"observables">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        observables: import("io-ts").ExactC<import("io-ts").TypeC<{
            count: import("io-ts").NumberC;
            actionType: import("io-ts").UnionC<[import("io-ts").LiteralC<"add">, import("io-ts").LiteralC<"delete">, import("io-ts").LiteralC<"update">]>;
        }>>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"extended_fields">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        extended_fields: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").StringC>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"template">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        template: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            id: import("io-ts").StringC;
            version: import("io-ts").NumberC;
        }>>, import("io-ts").NullC]>;
    }>>;
}>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"comment">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        comment: import("io-ts").UnionC<[import("io-ts").UnionC<[import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            comment: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.user>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.alert>;
            alertId: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
            index: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
            rule: import("io-ts").ExactC<import("io-ts").TypeC<{
                id: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                name: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.actions>;
            comment: import("io-ts").StringC;
            actions: import("io-ts").ExactC<import("io-ts").TypeC<{
                targets: import("io-ts").ArrayC<import("io-ts").ExactC<import("io-ts").TypeC<{
                    hostname: import("io-ts").StringC;
                    endpointId: import("io-ts").StringC;
                }>>>;
                type: import("io-ts").StringC;
            }>>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            externalReferenceId: import("io-ts").StringC;
            externalReferenceStorage: import("io-ts").ExactC<import("io-ts").TypeC<{
                type: import("io-ts").LiteralC<import("../../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc>;
            }>>;
            externalReferenceAttachmentTypeId: import("io-ts").StringC;
            externalReferenceMetadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.externalReference>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.persistableState>;
            owner: import("io-ts").StringC;
            persistableStateAttachmentTypeId: import("io-ts").StringC;
            persistableStateAttachmentState: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.event>;
            eventId: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
            index: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
            owner: import("io-ts").StringC;
        }>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
            externalReferenceStorage: import("io-ts").ExactC<import("io-ts").TypeC<{
                type: import("io-ts").LiteralC<import("../../../common/types/domain").ExternalReferenceStorageType.savedObject>;
                soType: import("io-ts").StringC;
            }>>;
            externalReferenceAttachmentTypeId: import("io-ts").StringC;
            externalReferenceMetadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.externalReference>;
            owner: import("io-ts").StringC;
        }>>]>, import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").StringC;
            attachmentId: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").ArrayC<import("io-ts").StringC>]>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            data: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            metadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").StringC;
            data: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
            owner: import("io-ts").StringC;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            metadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        }>>]>]>]>;
    }>>;
}>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"create_case">;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    payload: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        connector: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.casesWebhook>;
            fields: import("io-ts").NullC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.jira>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                issueType: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                priority: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                parent: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                otherFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.none>;
            fields: import("io-ts").NullC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.resilient>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                incidentTypes: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").NullC]>;
                severityCode: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowITSM>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                impact: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                severity: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                urgency: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                subcategory: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowSIR>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                destIp: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                malwareHash: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                malwareUrl: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                priority: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                sourceIp: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                subcategory: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.swimlane>;
            fields: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                caseId: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.theHive>;
            fields: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                tlp: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
            }>>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>]>;
    }>>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        assignees: import("io-ts").ArrayC<import("io-ts").ExactC<import("io-ts").TypeC<{
            uid: import("io-ts").StringC;
        }>>>;
        description: import("io-ts").StringC;
        status: import("io-ts").StringC;
        severity: import("io-ts").StringC;
        tags: import("io-ts").ArrayC<import("io-ts").StringC>;
        title: import("io-ts").StringC;
        settings: import("io-ts").PartialC<{
            syncAlerts: import("io-ts").BooleanC;
            extractObservables: import("io-ts").BooleanC;
        }>;
        owner: import("io-ts").StringC;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        customFields: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.TEXT>;
            value: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.TOGGLE>;
            value: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            key: import("io-ts").StringC;
            type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.NUMBER>;
            value: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
        }>>]>>;
    }>>]>]>;
}>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"connector">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        connector: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.casesWebhook>;
            fields: import("io-ts").NullC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.jira>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                issueType: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                priority: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                parent: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                otherFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.none>;
            fields: import("io-ts").NullC;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.resilient>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                incidentTypes: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").NullC]>;
                severityCode: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowITSM>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                impact: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                severity: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                urgency: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                subcategory: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowSIR>;
            fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                destIp: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                malwareHash: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                malwareUrl: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                priority: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                sourceIp: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
                subcategory: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>]>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.swimlane>;
            fields: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                caseId: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.theHive>;
            fields: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                tlp: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
            }>>, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
        }>>]>]>;
    }>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<"pushed">;
    payload: import("io-ts").ExactC<import("io-ts").TypeC<{
        externalService: import("io-ts").ExactC<import("io-ts").TypeC<{
            connector_name: import("io-ts").StringC;
            external_id: import("io-ts").StringC;
            external_title: import("io-ts").StringC;
            external_url: import("io-ts").StringC;
            pushed_at: import("io-ts").StringC;
            pushed_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
                email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
                full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
                username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
            }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
                profile_uid: import("io-ts").StringC;
            }>>]>;
        }>>;
    }>>;
}>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
    created_at: import("io-ts").StringC;
    created_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>;
    owner: import("io-ts").StringC;
    action: import("io-ts").KeyofC<{
        readonly add: "add";
        readonly create: "create";
        readonly delete: "delete";
        readonly update: "update";
        readonly push_to_service: "push_to_service";
    }>;
}>>]>;
export type UserActionTransformedAttributes = UserActionAttributes;
export type UserActionSavedObjectTransformed = SavedObject<UserActionTransformedAttributes>;
export {};
