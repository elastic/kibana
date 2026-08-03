import * as rt from 'io-ts';
import type { BulkGetAttachmentsRequest } from './v1';
export type { BulkGetAttachmentsRequest as BulkGetAttachmentsRequestV2 };
export declare const UnifiedAttachmentPatchRequestRt: rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
    id: rt.StringC;
    version: rt.StringC;
}>>]>;
export declare const AttachmentRequestRtV2: rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
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
export declare const AttachmentRequestWithoutRefsRtV2: rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
    comment: rt.StringC;
    type: rt.LiteralC<import("../../domain").AttachmentType.user>;
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
        type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.elasticSearchDoc>;
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
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../../domain").AttachmentType.event>;
    eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    owner: rt.StringC;
}>>]>, rt.ExactC<rt.TypeC<{
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../domain").ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<import("../../domain").AttachmentType.externalReference>;
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
export declare const AttachmentPatchRequestRtV2: rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
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
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
}>>]>, rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
    id: rt.StringC;
    version: rt.StringC;
}>>]>]>;
export declare const AttachmentsFindResponseRtV2: rt.ExactC<rt.TypeC<{
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
    page: rt.NumberC;
    per_page: rt.NumberC;
    total: rt.NumberC;
}>>;
export declare const BulkCreateAttachmentsRequestRtV2: rt.Type<({
    type: import("../../domain").AttachmentType.alert;
    alertId: string | string[];
    index: string | string[];
    rule: {
        id: string | null;
        name: string | null;
    };
    owner: string;
} | {
    type: import("../../domain").AttachmentType.event;
    eventId: string | string[];
    index: string | string[];
    owner: string;
} | {
    externalReferenceId: string;
    externalReferenceStorage: {
        type: import("../../domain").ExternalReferenceStorageType.elasticSearchDoc;
    };
    externalReferenceAttachmentTypeId: string;
    externalReferenceMetadata: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null;
    type: import("../../domain").AttachmentType.externalReference;
    owner: string;
} | {
    externalReferenceId: string;
    externalReferenceStorage: {
        type: import("../../domain").ExternalReferenceStorageType.savedObject;
        soType: string;
    };
    externalReferenceAttachmentTypeId: string;
    externalReferenceMetadata: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null;
    type: import("../../domain").AttachmentType.externalReference;
    owner: string;
} | {
    type: import("../../domain").AttachmentType.persistableState;
    owner: string;
    persistableStateAttachmentTypeId: string;
    persistableStateAttachmentState: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    };
} | ({
    type: string;
    attachmentId: string | string[];
    owner: string;
} & {
    data?: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null | undefined;
    metadata?: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null | undefined;
}) | ({
    type: string;
    data: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    };
    owner: string;
} & {
    metadata?: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null | undefined;
}) | {
    comment: string;
    type: import("../../domain").AttachmentType.user;
    owner: string;
} | {
    type: import("../../domain").AttachmentType.actions;
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
    type: import("../../domain").AttachmentType.alert;
    alertId: string | string[];
    index: string | string[];
    rule: {
        id: string | null;
        name: string | null;
    };
    owner: string;
} | {
    type: import("../../domain").AttachmentType.event;
    eventId: string | string[];
    index: string | string[];
    owner: string;
} | {
    externalReferenceId: string;
    externalReferenceStorage: {
        type: import("../../domain").ExternalReferenceStorageType.elasticSearchDoc;
    };
    externalReferenceAttachmentTypeId: string;
    externalReferenceMetadata: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null;
    type: import("../../domain").AttachmentType.externalReference;
    owner: string;
} | {
    externalReferenceId: string;
    externalReferenceStorage: {
        type: import("../../domain").ExternalReferenceStorageType.savedObject;
        soType: string;
    };
    externalReferenceAttachmentTypeId: string;
    externalReferenceMetadata: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null;
    type: import("../../domain").AttachmentType.externalReference;
    owner: string;
} | {
    type: import("../../domain").AttachmentType.persistableState;
    owner: string;
    persistableStateAttachmentTypeId: string;
    persistableStateAttachmentState: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    };
} | ({
    type: string;
    attachmentId: string | string[];
    owner: string;
} & {
    data?: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null | undefined;
    metadata?: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null | undefined;
}) | ({
    type: string;
    data: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    };
    owner: string;
} & {
    metadata?: {
        [x: string]: import("@kbn/utility-types").JsonValue;
    } | null | undefined;
}) | {
    comment: string;
    type: import("../../domain").AttachmentType.user;
    owner: string;
} | {
    type: import("../../domain").AttachmentType.actions;
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
export declare const BulkGetAttachmentsResponseRtV2: rt.ExactC<rt.TypeC<{
    attachments: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
    errors: rt.ArrayC<rt.ExactC<rt.TypeC<{
        error: rt.StringC;
        message: rt.StringC;
        status: rt.UnionC<[rt.UndefinedC, rt.NumberC]>;
        savedObjectId: rt.StringC;
    }>>>;
}>>;
export type AttachmentRequestV2 = rt.TypeOf<typeof AttachmentRequestRtV2>;
export type AttachmentPatchRequestV2 = rt.TypeOf<typeof AttachmentPatchRequestRtV2>;
export type AttachmentsFindResponseV2 = rt.TypeOf<typeof AttachmentsFindResponseRtV2>;
export type BulkCreateAttachmentsRequestV2 = rt.TypeOf<typeof BulkCreateAttachmentsRequestRtV2>;
export type BulkGetAttachmentsResponseV2 = rt.TypeOf<typeof BulkGetAttachmentsResponseRtV2>;
