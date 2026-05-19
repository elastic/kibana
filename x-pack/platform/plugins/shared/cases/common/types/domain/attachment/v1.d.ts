import * as rt from 'io-ts';
/**
 * Files
 */
export declare const SingleFileAttachmentMetadataRt: rt.ExactC<rt.TypeC<{
    name: rt.StringC;
    extension: rt.StringC;
    mimeType: rt.StringC;
    created: rt.StringC;
}>>;
export declare const FileAttachmentMetadataRt: rt.ExactC<rt.TypeC<{
    files: rt.ArrayC<rt.ExactC<rt.TypeC<{
        name: rt.StringC;
        extension: rt.StringC;
        mimeType: rt.StringC;
        created: rt.StringC;
    }>>>;
}>>;
export type FileAttachmentMetadata = rt.TypeOf<typeof FileAttachmentMetadataRt>;
export declare const AttachmentAttributesBasicRt: rt.ExactC<rt.TypeC<{
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
}>>;
export declare const FileAttachmentMetadataPayloadRt: rt.ExactC<rt.TypeC<{
    mimeType: rt.Type<string, string, unknown>;
    filename: rt.Type<string, string, unknown>;
}>>;
/**
 * User comment
 */
export declare enum AttachmentType {
    actions = "actions",
    alert = "alert",
    event = "event",
    externalReference = "externalReference",
    persistableState = "persistableState",
    user = "user"
}
export declare const UserCommentAttachmentPayloadRt: rt.ExactC<rt.TypeC<{
    comment: rt.StringC;
    type: rt.LiteralC<AttachmentType.user>;
    owner: rt.StringC;
}>>;
declare const UserCommentAttachmentAttributesRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>;
export declare const UserCommentAttachmentRt: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
}>>]>;
export type UserCommentAttachmentPayload = rt.TypeOf<typeof UserCommentAttachmentPayloadRt>;
export type UserCommentAttachmentAttributes = rt.TypeOf<typeof UserCommentAttachmentAttributesRt>;
export type UserCommentAttachment = rt.TypeOf<typeof UserCommentAttachmentRt>;
/**
 * Generic event
 */
export declare const EventAttachmentPayloadRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.event>;
    eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    owner: rt.StringC;
}>>;
/**
 * Alerts
 */
export declare const AlertAttachmentPayloadRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.alert>;
    alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    rule: rt.ExactC<rt.TypeC<{
        id: rt.UnionC<[rt.StringC, rt.NullC]>;
        name: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
    owner: rt.StringC;
}>>;
export declare const AlertAttachmentAttributesRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>;
export declare const EventAttachmentAttributesRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>;
export declare const AlertAttachmentRt: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
}>>]>;
export declare const EventAttachmentRt: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
}>>]>;
export type AlertAttachmentPayload = rt.TypeOf<typeof AlertAttachmentPayloadRt>;
export type AlertAttachmentAttributes = rt.TypeOf<typeof AlertAttachmentAttributesRt>;
export type AlertAttachment = rt.TypeOf<typeof AlertAttachmentRt>;
export type EventAttachmentPayload = rt.TypeOf<typeof EventAttachmentPayloadRt>;
export type EventAttachmentAttributes = rt.TypeOf<typeof EventAttachmentAttributesRt>;
export type EventAttachment = rt.TypeOf<typeof EventAttachmentRt>;
export declare const DocumentAttachmentAttributesRt: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>]>;
export type DocumentAttachmentAttributes = rt.TypeOf<typeof DocumentAttachmentAttributesRt>;
/**
 * Actions
 */
export declare enum IsolateHostActionType {
    isolate = "isolate",
    unisolate = "unisolate"
}
export declare const ActionsAttachmentPayloadRt: rt.ExactC<rt.TypeC<{
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
}>>;
declare const ActionsAttachmentAttributesRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>;
export declare const ActionsAttachmentRt: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
}>>]>;
export type ActionsAttachmentPayload = rt.TypeOf<typeof ActionsAttachmentPayloadRt>;
export type ActionsAttachmentAttributes = rt.TypeOf<typeof ActionsAttachmentAttributesRt>;
export type ActionsAttachment = rt.TypeOf<typeof ActionsAttachmentRt>;
/**
 * External reference
 */
export declare enum ExternalReferenceStorageType {
    savedObject = "savedObject",
    elasticSearchDoc = "elasticSearchDoc"
}
export declare const ExternalReferenceNoSOAttachmentPayloadRt: rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>;
export declare const ExternalReferenceSOAttachmentPayloadRt: rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>;
export declare const ExternalReferenceSOWithoutRefsAttachmentPayloadRt: rt.ExactC<rt.TypeC<{
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>;
export declare const ExternalReferenceAttachmentPayloadRt: rt.UnionC<[rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>]>;
export declare const ExternalReferenceWithoutRefsAttachmentPayloadRt: rt.UnionC<[rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>]>;
declare const ExternalReferenceAttachmentAttributesRt: rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
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
}>>]>;
declare const ExternalReferenceNoSOAttachmentAttributesRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
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
}>>]>;
declare const ExternalReferenceSOAttachmentAttributesRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
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
}>>]>;
export declare const ExternalReferenceAttachmentRt: rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
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
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
}>>]>;
export type ExternalReferenceAttachmentPayload = rt.TypeOf<typeof ExternalReferenceAttachmentPayloadRt>;
export type ExternalReferenceSOAttachmentPayload = rt.TypeOf<typeof ExternalReferenceSOAttachmentPayloadRt>;
export type ExternalReferenceNoSOAttachmentPayload = rt.TypeOf<typeof ExternalReferenceNoSOAttachmentPayloadRt>;
export type ExternalReferenceAttachmentAttributes = rt.TypeOf<typeof ExternalReferenceAttachmentAttributesRt>;
export type ExternalReferenceSOAttachmentAttributes = rt.TypeOf<typeof ExternalReferenceSOAttachmentAttributesRt>;
export type ExternalReferenceNoSOAttachmentAttributes = rt.TypeOf<typeof ExternalReferenceNoSOAttachmentAttributesRt>;
export type ExternalReferenceWithoutRefsAttachmentPayload = rt.TypeOf<typeof ExternalReferenceWithoutRefsAttachmentPayloadRt>;
export type ExternalReferenceAttachment = rt.TypeOf<typeof ExternalReferenceAttachmentRt>;
/**
 * Persistable state
 */
export declare const PersistableStateAttachmentPayloadRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<AttachmentType.persistableState>;
    owner: rt.StringC;
    persistableStateAttachmentTypeId: rt.StringC;
    persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
}>>;
declare const PersistableStateAttachmentAttributesRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>;
export declare const PersistableStateAttachmentRt: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>, rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
}>>]>;
export type PersistableStateAttachmentPayload = rt.TypeOf<typeof PersistableStateAttachmentPayloadRt>;
export type PersistableStateAttachment = rt.TypeOf<typeof PersistableStateAttachmentRt>;
export type PersistableStateAttachmentAttributes = rt.TypeOf<typeof PersistableStateAttachmentAttributesRt>;
/**
 * Common
 */
export declare const AttachmentPayloadRt: rt.UnionC<[rt.ExactC<rt.TypeC<{
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
    type: rt.LiteralC<AttachmentType.event>;
    eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
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
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
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
export declare const AttachmentAttributesRt: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
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
}>>]>]>;
declare const AttachmentAttributesNoSORt: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
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
}>>]>]>;
declare const AttachmentAttributesWithoutRefsRt: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
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
}>>]>]>;
export declare const AttachmentRt: rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
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
}>>]>;
export declare const AttachmentsRt: rt.ArrayC<rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
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
/**
 * This type is used by the CaseService.
 * Because the type for the attributes of savedObjectClient update function is Partial<T>
 * we need to make all of our attributes partial too.
 * We ensure that partial updates of CommentContext is not going to happen inside the patch comment route.
 */
export declare const AttachmentPatchAttributesRt: rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.PartialC<{
    comment: rt.StringC;
    type: rt.LiteralC<AttachmentType.user>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    type: rt.LiteralC<AttachmentType.alert>;
    alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    rule: rt.ExactC<rt.TypeC<{
        id: rt.UnionC<[rt.StringC, rt.NullC]>;
        name: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    type: rt.LiteralC<AttachmentType.event>;
    eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
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
}>>, rt.ExactC<rt.PartialC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    type: rt.LiteralC<AttachmentType.persistableState>;
    owner: rt.StringC;
    persistableStateAttachmentTypeId: rt.StringC;
    persistableStateAttachmentState: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
}>>]>, rt.ExactC<rt.PartialC<{
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
}>>]>;
export type AttachmentAttributes = rt.TypeOf<typeof AttachmentAttributesRt>;
export type AttachmentAttributesNoSO = rt.TypeOf<typeof AttachmentAttributesNoSORt>;
export type AttachmentAttributesWithoutRefs = rt.TypeOf<typeof AttachmentAttributesWithoutRefsRt>;
export type AttachmentPatchAttributes = rt.TypeOf<typeof AttachmentPatchAttributesRt>;
export type Attachment = rt.TypeOf<typeof AttachmentRt>;
export type Attachments = rt.TypeOf<typeof AttachmentsRt>;
export {};
