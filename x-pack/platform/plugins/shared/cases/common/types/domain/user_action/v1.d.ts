import * as rt from 'io-ts';
import { AssigneesUserActionRt } from './assignees/v1';
import { CategoryUserActionRt } from './category/v1';
import type { CommentUserActionPayloadWithoutIdsRt } from './comment/v1';
import { CommentUserActionRt } from './comment/v1';
import { ConnectorUserActionRt, ConnectorUserActionWithoutConnectorIdRt } from './connector/v1';
import { CreateCaseUserActionRt, CreateCaseUserActionWithoutConnectorIdRt } from './create_case/v1';
import { DeleteCaseUserActionRt } from './delete_case/v1';
import { DescriptionUserActionRt } from './description/v1';
import { PushedUserActionRt, PushedUserActionWithoutConnectorIdRt } from './pushed/v1';
import type { SettingsUserActionPayloadRt } from './settings/v1';
import { SettingsUserActionRt } from './settings/v1';
import { SeverityUserActionRt } from './severity/v1';
import { StatusUserActionRt } from './status/v1';
import { TagsUserActionRt } from './tags/v1';
import { TitleUserActionRt } from './title/v1';
import { CustomFieldsUserActionRt } from './custom_fields/v1';
import { ObservablesUserActionRt } from './observables/v1';
import { ExtendedFieldsUserActionRt } from './extended_fields/v1';
import { TemplateUserActionRt } from './template/v1';
export { UserActionTypes, UserActionActions } from './action/v1';
export { StatusUserActionRt } from './status/v1';
export type { UserActionType, UserActionAction } from './action/v1';
declare const UserActionCommonAttributesRt: rt.ExactC<rt.TypeC<{
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
}>>;
/**
 * This should only be used for the getAll route and it should be removed when the route is removed
 * @deprecated use CaseUserActionInjectedIdsRt instead
 */
export declare const CaseUserActionInjectedDeprecatedIdsRt: rt.ExactC<rt.TypeC<{
    action_id: rt.StringC;
    case_id: rt.StringC;
    comment_id: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>;
export declare const CaseUserActionInjectedIdsRt: rt.ExactC<rt.TypeC<{
    comment_id: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>;
declare const UserActionPayloadRt: rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
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
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components").CaseStatuses.closed>]>;
    }>, rt.PartialC<{
        closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
        syncedAlertCount: rt.NumberC;
    }>]>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"severity">;
    payload: rt.ExactC<rt.TypeC<{
        severity: rt.UnionC<[rt.LiteralC<import("..").CaseSeverity.LOW>, rt.LiteralC<import("..").CaseSeverity.MEDIUM>, rt.LiteralC<import("..").CaseSeverity.HIGH>, rt.LiteralC<import("..").CaseSeverity.CRITICAL>]>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
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
            type: rt.LiteralC<import("..").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.actions>;
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
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.persistableState>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>]>>;
    }>>]>]>;
}>>]>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"connector">;
    payload: rt.ExactC<rt.TypeC<{
        connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
        }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
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
}>>]>;
export declare const CaseUserActionBasicRt: rt.IntersectionC<[rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
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
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components").CaseStatuses.closed>]>;
    }>, rt.PartialC<{
        closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
        syncedAlertCount: rt.NumberC;
    }>]>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"severity">;
    payload: rt.ExactC<rt.TypeC<{
        severity: rt.UnionC<[rt.LiteralC<import("..").CaseSeverity.LOW>, rt.LiteralC<import("..").CaseSeverity.MEDIUM>, rt.LiteralC<import("..").CaseSeverity.HIGH>, rt.LiteralC<import("..").CaseSeverity.CRITICAL>]>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
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
            type: rt.LiteralC<import("..").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.actions>;
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
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.persistableState>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>]>>;
    }>>]>]>;
}>>]>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"connector">;
    payload: rt.ExactC<rt.TypeC<{
        connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
        }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
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
}>>]>;
export declare const CaseUserActionWithoutReferenceIdsRt: rt.IntersectionC<[rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
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
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components").CaseStatuses.closed>]>;
    }>, rt.PartialC<{
        closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
        syncedAlertCount: rt.NumberC;
    }>]>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"severity">;
    payload: rt.ExactC<rt.TypeC<{
        severity: rt.UnionC<[rt.LiteralC<import("..").CaseSeverity.LOW>, rt.LiteralC<import("..").CaseSeverity.MEDIUM>, rt.LiteralC<import("..").CaseSeverity.HIGH>, rt.LiteralC<import("..").CaseSeverity.CRITICAL>]>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
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
        comment: rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
            comment: rt.StringC;
            type: rt.LiteralC<import("..").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
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
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("..").ExternalReferenceStorageType.elasticSearchDoc>;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("..").AttachmentType.externalReference>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.persistableState>;
            owner: rt.StringC;
            persistableStateAttachmentTypeId: rt.StringC;
            persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>]>, rt.ExactC<rt.TypeC<{
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("..").ExternalReferenceStorageType.savedObject>;
                soType: rt.StringC;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("..").AttachmentType.externalReference>;
            owner: rt.StringC;
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
        connector: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>]>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>]>>;
    }>>]>]>;
}>>]>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"connector">;
    payload: rt.ExactC<rt.TypeC<{
        connector: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>]>;
    }>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"pushed">;
    payload: rt.ExactC<rt.TypeC<{
        externalService: rt.ExactC<rt.TypeC<{
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
        }>>;
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
}>>]>;
/**
 * This includes the comment_id but not the action_id or case_id
 */
export declare const UserActionAttributesRt: rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
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
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components").CaseStatuses.closed>]>;
    }>, rt.PartialC<{
        closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
        syncedAlertCount: rt.NumberC;
    }>]>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"severity">;
    payload: rt.ExactC<rt.TypeC<{
        severity: rt.UnionC<[rt.LiteralC<import("..").CaseSeverity.LOW>, rt.LiteralC<import("..").CaseSeverity.MEDIUM>, rt.LiteralC<import("..").CaseSeverity.HIGH>, rt.LiteralC<import("..").CaseSeverity.CRITICAL>]>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
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
            type: rt.LiteralC<import("..").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.actions>;
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
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.persistableState>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>]>>;
    }>>]>]>;
}>>]>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"connector">;
    payload: rt.ExactC<rt.TypeC<{
        connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
        }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
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
}>>]>;
declare const UserActionRt: rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
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
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components").CaseStatuses.closed>]>;
    }>, rt.PartialC<{
        closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
        syncedAlertCount: rt.NumberC;
    }>]>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"severity">;
    payload: rt.ExactC<rt.TypeC<{
        severity: rt.UnionC<[rt.LiteralC<import("..").CaseSeverity.LOW>, rt.LiteralC<import("..").CaseSeverity.MEDIUM>, rt.LiteralC<import("..").CaseSeverity.HIGH>, rt.LiteralC<import("..").CaseSeverity.CRITICAL>]>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
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
            type: rt.LiteralC<import("..").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.actions>;
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
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.persistableState>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>]>>;
    }>>]>]>;
}>>]>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"connector">;
    payload: rt.ExactC<rt.TypeC<{
        connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
        }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
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
}>>]>;
export declare const UserActionsRt: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
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
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components").CaseStatuses.closed>]>;
    }>, rt.PartialC<{
        closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
        syncedAlertCount: rt.NumberC;
    }>]>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"severity">;
    payload: rt.ExactC<rt.TypeC<{
        severity: rt.UnionC<[rt.LiteralC<import("..").CaseSeverity.LOW>, rt.LiteralC<import("..").CaseSeverity.MEDIUM>, rt.LiteralC<import("..").CaseSeverity.HIGH>, rt.LiteralC<import("..").CaseSeverity.CRITICAL>]>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
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
            type: rt.LiteralC<import("..").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.actions>;
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
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").AttachmentType.persistableState>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
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
            type: rt.LiteralC<import("..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("..").CustomFieldTypes.NUMBER>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>]>>;
    }>>]>]>;
}>>]>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"connector">;
    payload: rt.ExactC<rt.TypeC<{
        connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
        }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("..").ConnectorTypes.theHive>;
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
type UserActionWithAttributes<T> = T & rt.TypeOf<typeof UserActionCommonAttributesRt>;
export type UserActionWithDeprecatedResponse<T> = T & rt.TypeOf<typeof CaseUserActionInjectedDeprecatedIdsRt>;
export type CaseUserActionWithoutReferenceIds = rt.TypeOf<typeof CaseUserActionWithoutReferenceIdsRt>;
export type UserActionPayload = rt.TypeOf<typeof UserActionPayloadRt>;
export type UserActionAttributes = rt.TypeOf<typeof UserActionAttributesRt>;
export type UserActions = rt.TypeOf<typeof UserActionsRt>;
export type UserAction<T extends UserActionPayload = UserActionPayload> = Omit<rt.TypeOf<typeof UserActionRt>, 'type' | 'payload'> & T;
/**
 * User actions
 */
export type AssigneesUserAction = UserAction<rt.TypeOf<typeof AssigneesUserActionRt>>;
export type CategoryUserAction = UserAction<rt.TypeOf<typeof CategoryUserActionRt>>;
export type CommentUserAction = UserAction<rt.TypeOf<typeof CommentUserActionRt>>;
export type CommentUserActionPayloadWithoutIds = UserActionWithAttributes<rt.TypeOf<typeof CommentUserActionPayloadWithoutIdsRt>>;
export type ConnectorUserAction = UserAction<rt.TypeOf<typeof ConnectorUserActionRt>>;
export type ConnectorUserActionWithoutConnectorId = UserActionWithAttributes<rt.TypeOf<typeof ConnectorUserActionWithoutConnectorIdRt>>;
export type DeleteCaseUserAction = UserAction<rt.TypeOf<typeof DeleteCaseUserActionRt>>;
export type DescriptionUserAction = UserAction<rt.TypeOf<typeof DescriptionUserActionRt>>;
export type PushedUserAction = UserAction<rt.TypeOf<typeof PushedUserActionRt>>;
export type PushedUserActionWithoutConnectorId = UserActionWithAttributes<rt.TypeOf<typeof PushedUserActionWithoutConnectorIdRt>>;
export type SettingsUserAction = UserAction<rt.TypeOf<typeof SettingsUserActionRt>>;
export type SettingsUserActionPayload = rt.TypeOf<typeof SettingsUserActionPayloadRt>;
export type SeverityUserAction = UserAction<rt.TypeOf<typeof SeverityUserActionRt>>;
export type StatusUserAction = UserAction<rt.TypeOf<typeof StatusUserActionRt>>;
export type TagsUserAction = UserAction<rt.TypeOf<typeof TagsUserActionRt>>;
export type TitleUserAction = UserAction<rt.TypeOf<typeof TitleUserActionRt>>;
export type CreateCaseUserAction = UserAction<rt.TypeOf<typeof CreateCaseUserActionRt>>;
export type CreateCaseUserActionWithoutConnectorId = UserActionWithAttributes<rt.TypeOf<typeof CreateCaseUserActionWithoutConnectorIdRt>>;
export type CustomFieldsUserAction = UserAction<rt.TypeOf<typeof CustomFieldsUserActionRt>>;
export type ObservablesUserAction = UserAction<rt.TypeOf<typeof ObservablesUserActionRt>>;
export type ExtendedFieldsUserAction = UserAction<rt.TypeOf<typeof ExtendedFieldsUserActionRt>>;
export { ExtendedFieldsRt } from './extended_fields/v1';
export type TemplateUserAction = UserAction<rt.TypeOf<typeof TemplateUserActionRt>>;
