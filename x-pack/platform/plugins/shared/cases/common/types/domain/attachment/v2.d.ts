import * as rt from 'io-ts';
/**
 * Payload for Reference-based Attachments
 * - type: always required
 * - attachmentId: required - references external entities (alerts, events, external references)
 * - metadata: optional - additional metadata about the reference
 * - data: optional - some reference attachments may also have data
 */
export declare const UnifiedReferenceAttachmentPayloadRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.StringC;
    attachmentId: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    data: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
}>>]>;
/**
 * Payload for Value-based Attachments
 * - type: always required
 * - data: required - contains content/state (user comments, persistable state, visualizations)
 * - metadata: optional - additional metadata
 */
export declare const UnifiedValueAttachmentPayloadRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.StringC;
    data: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
}>>]>;
export declare const UnifiedAttachmentPayloadRt: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>]>;
/**
 * Saved Object attributes for Unified Attachments
 * Contains the payload and the basic attributes
 */
export declare const UnifiedAttachmentAttributesRt: rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>;
/**
 * Full Saved Object representationfor Unified Attachments
 * Contains payload, basic attributes and id and version
 */
export declare const UnifiedAttachmentRt: rt.IntersectionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>;
export declare const UnifiedAttachmentPatchAttributesRt: rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.PartialC<{
    type: rt.StringC;
    owner: rt.StringC;
    attachmentId: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
    data: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
}>>, rt.ExactC<rt.PartialC<{
    type: rt.StringC;
    owner: rt.StringC;
    data: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
    metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
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
export type UnifiedReferenceAttachmentPayload = rt.TypeOf<typeof UnifiedReferenceAttachmentPayloadRt>;
export type UnifiedValueAttachmentPayload = rt.TypeOf<typeof UnifiedValueAttachmentPayloadRt>;
export type UnifiedAttachmentPayload = rt.TypeOf<typeof UnifiedAttachmentPayloadRt>;
export type UnifiedAttachmentAttributes = rt.TypeOf<typeof UnifiedAttachmentAttributesRt>;
export type UnifiedAttachment = rt.TypeOf<typeof UnifiedAttachmentRt>;
export declare const DocumentAttachmentAttributesRtV2: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("./v1").AttachmentType.alert>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.event>;
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
    type: rt.UnionC<[rt.LiteralC<"security.event">, rt.LiteralC<"security.alert">, rt.LiteralC<"observability.alert">, rt.LiteralC<"stack.alert">]>;
    attachmentId: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    metadata: rt.UnionC<[rt.NullC, rt.ExactC<rt.PartialC<{
        index: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
        rule: rt.UnionC<[rt.NullC, rt.ExactC<rt.TypeC<{
            id: rt.UnionC<[rt.StringC, rt.NullC]>;
            name: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>;
    }>>]>;
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
export type DocumentAttachmentAttributesV2 = rt.TypeOf<typeof DocumentAttachmentAttributesRtV2>;
/**
 * Transitional read-shape mode while v1/v2 attachments coexist.
 */
export type AttachmentMode = 'legacy' | 'unified';
/**
 * Combined v1 legacy and v2 unified attachment types
 */
export declare const AttachmentRtV2: rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    comment: rt.StringC;
    type: rt.LiteralC<import("./v1").AttachmentType.user>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.alert>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.event>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.actions>;
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
        type: rt.LiteralC<import("./v1").ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<import("./v1").AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("./v1").ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<import("./v1").AttachmentType.externalReference>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.persistableState>;
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
}>>]>]>;
export declare const AttachmentsRtV2: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    comment: rt.StringC;
    type: rt.LiteralC<import("./v1").AttachmentType.user>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.alert>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.event>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.actions>;
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
        type: rt.LiteralC<import("./v1").ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<import("./v1").AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("./v1").ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<import("./v1").AttachmentType.externalReference>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.persistableState>;
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
export declare const AttachmentAttributesRtV2: rt.UnionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    comment: rt.StringC;
    type: rt.LiteralC<import("./v1").AttachmentType.user>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.alert>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.event>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.actions>;
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
        type: rt.LiteralC<import("./v1").ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<import("./v1").AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.TypeC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("./v1").ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<import("./v1").AttachmentType.externalReference>;
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
    type: rt.LiteralC<import("./v1").AttachmentType.persistableState>;
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
}>>]>]>, rt.IntersectionC<[rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
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
}>>]>]>;
export declare const AttachmentPatchAttributesRtV2: rt.UnionC<[rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.PartialC<{
    comment: rt.StringC;
    type: rt.LiteralC<import("./v1").AttachmentType.user>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    type: rt.LiteralC<import("./v1").AttachmentType.alert>;
    alertId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    rule: rt.ExactC<rt.TypeC<{
        id: rt.UnionC<[rt.StringC, rt.NullC]>;
        name: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    type: rt.LiteralC<import("./v1").AttachmentType.event>;
    eventId: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    index: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    type: rt.LiteralC<import("./v1").AttachmentType.actions>;
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
        type: rt.LiteralC<import("./v1").ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<import("./v1").AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    externalReferenceId: rt.StringC;
    externalReferenceStorage: rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("./v1").ExternalReferenceStorageType.savedObject>;
        soType: rt.StringC;
    }>>;
    externalReferenceAttachmentTypeId: rt.StringC;
    externalReferenceMetadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    type: rt.LiteralC<import("./v1").AttachmentType.externalReference>;
    owner: rt.StringC;
}>>, rt.ExactC<rt.PartialC<{
    type: rt.LiteralC<import("./v1").AttachmentType.persistableState>;
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
}>>]>, rt.IntersectionC<[rt.UnionC<[rt.ExactC<rt.PartialC<{
    type: rt.StringC;
    owner: rt.StringC;
    attachmentId: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
    data: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
    metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
}>>, rt.ExactC<rt.PartialC<{
    type: rt.StringC;
    owner: rt.StringC;
    data: rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>;
    metadata: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.Type<import("@kbn/utility-types").JsonValue, import("@kbn/utility-types").JsonValue, unknown>>]>;
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
}>>]>]>;
export type AttachmentV2 = rt.TypeOf<typeof AttachmentRtV2>;
export type AttachmentsV2 = rt.TypeOf<typeof AttachmentsRtV2>;
export type AttachmentAttributesV2 = rt.TypeOf<typeof AttachmentAttributesRtV2>;
export type AttachmentPatchAttributesV2 = rt.TypeOf<typeof AttachmentPatchAttributesRtV2>;
