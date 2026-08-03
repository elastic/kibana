import * as rt from 'io-ts';
export declare const CommentUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    comment: rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
        comment: rt.Type<string, string, unknown>;
        type: rt.LiteralC<import("../..").AttachmentType.user>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../..").AttachmentType.event>;
        eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../..").AttachmentType.alert>;
        alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        rule: rt.ExactC<rt.TypeC<{
            id: rt.UnionC<[rt.StringC, rt.NullC]>;
            name: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../..").AttachmentType.actions>;
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
            type: rt.LiteralC<import("../..").ExternalReferenceStorageType.elasticSearchDoc>;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("../..").AttachmentType.externalReference>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        externalReferenceId: rt.StringC;
        externalReferenceStorage: rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ExternalReferenceStorageType.savedObject>;
            soType: rt.StringC;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("../..").AttachmentType.externalReference>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../..").AttachmentType.persistableState>;
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
export declare const CommentUserActionPayloadWithoutIdsRt: rt.ExactC<rt.TypeC<{
    comment: rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
        comment: rt.StringC;
        type: rt.LiteralC<import("../..").AttachmentType.user>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../..").AttachmentType.alert>;
        alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        rule: rt.ExactC<rt.TypeC<{
            id: rt.UnionC<[rt.StringC, rt.NullC]>;
            name: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../..").AttachmentType.actions>;
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
            type: rt.LiteralC<import("../..").ExternalReferenceStorageType.elasticSearchDoc>;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("../..").AttachmentType.externalReference>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../..").AttachmentType.persistableState>;
        owner: rt.StringC;
        persistableStateAttachmentTypeId: rt.StringC;
        persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../..").AttachmentType.event>;
        eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        owner: rt.StringC;
    }>>]>, rt.ExactC<rt.TypeC<{
        externalReferenceStorage: rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ExternalReferenceStorageType.savedObject>;
            soType: rt.StringC;
        }>>;
        externalReferenceAttachmentTypeId: rt.StringC;
        externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
        type: rt.LiteralC<import("../..").AttachmentType.externalReference>;
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
export declare const CommentUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"comment">;
    payload: rt.ExactC<rt.TypeC<{
        comment: rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
            comment: rt.Type<string, string, unknown>;
            type: rt.LiteralC<import("../..").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").AttachmentType.actions>;
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
                type: rt.LiteralC<import("../..").ExternalReferenceStorageType.elasticSearchDoc>;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../..").AttachmentType.externalReference>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            externalReferenceId: rt.StringC;
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../..").ExternalReferenceStorageType.savedObject>;
                soType: rt.StringC;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../..").AttachmentType.externalReference>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").AttachmentType.persistableState>;
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
}>>;
export declare const CommentUserActionWithoutIdsRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"comment">;
    payload: rt.ExactC<rt.TypeC<{
        comment: rt.UnionC<[rt.UnionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
            comment: rt.StringC;
            type: rt.LiteralC<import("../..").AttachmentType.user>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").AttachmentType.alert>;
            alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            rule: rt.ExactC<rt.TypeC<{
                id: rt.UnionC<[rt.StringC, rt.NullC]>;
                name: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").AttachmentType.actions>;
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
                type: rt.LiteralC<import("../..").ExternalReferenceStorageType.elasticSearchDoc>;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../..").AttachmentType.externalReference>;
            owner: rt.StringC;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").AttachmentType.persistableState>;
            owner: rt.StringC;
            persistableStateAttachmentTypeId: rt.StringC;
            persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").AttachmentType.event>;
            eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            owner: rt.StringC;
        }>>]>, rt.ExactC<rt.TypeC<{
            externalReferenceStorage: rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../..").ExternalReferenceStorageType.savedObject>;
                soType: rt.StringC;
            }>>;
            externalReferenceAttachmentTypeId: rt.StringC;
            externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
            type: rt.LiteralC<import("../..").AttachmentType.externalReference>;
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
}>>;
