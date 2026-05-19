import * as rt from 'io-ts';
import { AttachmentType } from '../../domain/attachment/v1';
export declare const BulkDeleteFileAttachmentsRequestRt: rt.ExactC<rt.TypeC<{
    ids: rt.Type<string[], string[], unknown>;
}>>;
export declare const PostFileAttachmentRequestRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    file: rt.UnknownC;
}>>, rt.ExactC<rt.PartialC<{
    filename: rt.Type<string, string, unknown>;
}>>]>;
export type BulkDeleteFileAttachmentsRequest = rt.TypeOf<typeof BulkDeleteFileAttachmentsRequestRt>;
export type PostFileAttachmentRequest = rt.TypeOf<typeof PostFileAttachmentRequestRt>;
export declare const AttachmentRequestRt: rt.UnionC<[rt.ExactC<rt.TypeC<{
    comment: rt.Type<string, string, unknown>;
    type: rt.LiteralC<AttachmentType.user>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.event>;
    eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.alert>;
    alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    rule: rt.ExactC<rt.TypeC<{
        id: rt.UnionC<[rt.StringC, rt.NullC]>;
        name: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.actions>;
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
        type: rt.LiteralC<import("../../domain/attachment/v1").ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain/attachment/v1").ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.persistableState>;
    owner: rt.StringC;
    persistableStateAttachmentTypeId: rt.StringC;
    persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
}>>]>;
export declare const AttachmentRequestWithoutRefsRt: rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
    comment: rt.StringC;
    type: rt.LiteralC<AttachmentType.user>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.alert>;
    alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    rule: rt.ExactC<rt.TypeC<{
        id: rt.UnionC<[rt.StringC, rt.NullC]>;
        name: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.actions>;
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
        type: rt.LiteralC<import("../../domain/attachment/v1").ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.persistableState>;
    owner: rt.StringC;
    persistableStateAttachmentTypeId: rt.StringC;
    persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.event>;
    eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    owner: rt.StringC;
}>>]>, rt.ExactC<rt.TypeC<{
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain/attachment/v1").ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>]>;
export declare const AttachmentPatchRequestRt: rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
    comment: rt.Type<string, string, unknown>;
    type: rt.LiteralC<AttachmentType.user>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.event>;
    eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.alert>;
    alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    rule: rt.ExactC<rt.TypeC<{
        id: rt.UnionC<[rt.StringC, rt.NullC]>;
        name: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.actions>;
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
        type: rt.LiteralC<import("../../domain/attachment/v1").ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain/attachment/v1").ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.persistableState>;
    owner: rt.StringC;
    persistableStateAttachmentTypeId: rt.StringC;
    persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
}>>]>;
export declare const AttachmentsFindResponseRt: rt.ExactC<rt.TypeC<{
    comments: rt.ArrayC<rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        comment: rt.StringC;
        type: rt.LiteralC<AttachmentType.user>;
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
        type: rt.LiteralC<AttachmentType.alert>;
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
        type: rt.LiteralC<AttachmentType.event>;
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
        type: rt.LiteralC<AttachmentType.actions>;
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
            type: rt.LiteralC<import("../../domain/attachment/v1").ExternalReferenceStorageType.elasticSearchDoc>;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<AttachmentType.externalReference>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        externalReferenceId: rt.StringC;
        externalReferenceStorage: rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain/attachment/v1").ExternalReferenceStorageType.savedObject>;
            soType: rt.StringC;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<AttachmentType.externalReference>;
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
        type: rt.LiteralC<AttachmentType.persistableState>;
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
    }>>]>>;
    page: rt.NumberC;
    per_page: rt.NumberC;
    total: rt.NumberC;
}>>;
export declare const FindAttachmentsQueryParamsRt: rt.IntersectionC<[rt.ExactC<rt.PartialC<{
    /**
     * Order to sort the response
     */
    sortOrder: rt.UnionC<[rt.LiteralC<"desc">, rt.LiteralC<"asc">]>;
}>>, rt.PartialType<undefined, Partial<import("../../../schema/types").Pagination>, Partial<import("../../../schema/types").Pagination>, unknown>]>;
export declare const BulkCreateAttachmentsRequestRt: rt.Type<({
    type: AttachmentType.alert;
    alertId: string | string[];
    index: string | string[];
    rule: {
        id: string | null;
        name: string | null;
    };
    owner: string;
} | {
    type: AttachmentType.event;
    eventId: string | string[];
    index: string | string[];
    owner: string;
} | {
    externalReferenceId: string;
    externalReferenceStorage: {
        type: import("../../domain/attachment/v1").ExternalReferenceStorageType.elasticSearchDoc;
    };
    externalReferenceAttachmentTypeId: string;
    externalReferenceMetadata: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null;
    type: AttachmentType.externalReference;
    owner: string;
} | {
    externalReferenceId: string;
    externalReferenceStorage: {
        type: import("../../domain/attachment/v1").ExternalReferenceStorageType.savedObject;
        soType: string;
    };
    externalReferenceAttachmentTypeId: string;
    externalReferenceMetadata: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null;
    type: AttachmentType.externalReference;
    owner: string;
} | {
    type: AttachmentType.persistableState;
    owner: string;
    persistableStateAttachmentTypeId: string;
    persistableStateAttachmentState: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    };
} | {
    comment: string;
    type: AttachmentType.user;
    owner: string;
} | {
    type: AttachmentType.actions;
    comment: string;
    actions: {
        targets: {
            hostname: string;
            endpointId: string;
        }[];
        type: string;
    };
    owner: string;
})[], ({
    type: AttachmentType.alert;
    alertId: string | string[];
    index: string | string[];
    rule: {
        id: string | null;
        name: string | null;
    };
    owner: string;
} | {
    type: AttachmentType.event;
    eventId: string | string[];
    index: string | string[];
    owner: string;
} | {
    externalReferenceId: string;
    externalReferenceStorage: {
        type: import("../../domain/attachment/v1").ExternalReferenceStorageType.elasticSearchDoc;
    };
    externalReferenceAttachmentTypeId: string;
    externalReferenceMetadata: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null;
    type: AttachmentType.externalReference;
    owner: string;
} | {
    externalReferenceId: string;
    externalReferenceStorage: {
        type: import("../../domain/attachment/v1").ExternalReferenceStorageType.savedObject;
        soType: string;
    };
    externalReferenceAttachmentTypeId: string;
    externalReferenceMetadata: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null;
    type: AttachmentType.externalReference;
    owner: string;
} | {
    type: AttachmentType.persistableState;
    owner: string;
    persistableStateAttachmentTypeId: string;
    persistableStateAttachmentState: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    };
} | {
    comment: string;
    type: AttachmentType.user;
    owner: string;
} | {
    type: AttachmentType.actions;
    comment: string;
    actions: {
        targets: {
            hostname: string;
            endpointId: string;
        }[];
        type: string;
    };
    owner: string;
})[], unknown>;
export declare const BulkGetAttachmentsRequestRt: rt.ExactC<rt.TypeC<{
    ids: rt.Type<string[], string[], unknown>;
}>>;
export declare const BulkGetAttachmentsResponseRt: rt.ExactC<rt.TypeC<{
    attachments: rt.ArrayC<rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        comment: rt.StringC;
        type: rt.LiteralC<AttachmentType.user>;
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
        type: rt.LiteralC<AttachmentType.alert>;
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
        type: rt.LiteralC<AttachmentType.event>;
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
        type: rt.LiteralC<AttachmentType.actions>;
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
            type: rt.LiteralC<import("../../domain/attachment/v1").ExternalReferenceStorageType.elasticSearchDoc>;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<AttachmentType.externalReference>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        externalReferenceId: rt.StringC;
        externalReferenceStorage: rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../domain/attachment/v1").ExternalReferenceStorageType.savedObject>;
            soType: rt.StringC;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<AttachmentType.externalReference>;
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
        type: rt.LiteralC<AttachmentType.persistableState>;
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
    }>>]>>;
    errors: rt.ArrayC<rt.ExactC<rt.TypeC<{
        error: rt.StringC;
        message: rt.StringC;
        status: rt.UnionC<[rt.UndefinedC, rt.NumberC]>;
        savedObjectId: rt.StringC;
    }>>>;
}>>;
export type FindAttachmentsQueryParams = rt.TypeOf<typeof FindAttachmentsQueryParamsRt>;
export type AttachmentsFindResponse = rt.TypeOf<typeof AttachmentsFindResponseRt>;
export type AttachmentRequest = rt.TypeOf<typeof AttachmentRequestRt>;
export type AttachmentPatchRequest = rt.TypeOf<typeof AttachmentPatchRequestRt>;
export type BulkCreateAttachmentsRequest = rt.TypeOf<typeof BulkCreateAttachmentsRequestRt>;
export type BulkGetAttachmentsResponse = rt.TypeOf<typeof BulkGetAttachmentsResponseRt>;
export type BulkGetAttachmentsRequest = rt.TypeOf<typeof BulkGetAttachmentsRequestRt>;
