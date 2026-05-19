import type { SavedObject } from '@kbn/core/server';
import type { JsonValue } from '@kbn/utility-types';
import type { AttachmentAttributes } from '../../../common/types/domain';
import type { User } from './user';
export interface AttachmentRequestAttributes {
    type: string;
    alertId?: string | string[];
    index?: string | string[];
    rule?: {
        id: string | null;
        name: string | null;
    };
    comment?: string;
    actions?: {
        targets: Array<{
            hostname: string;
            endpointId: string;
        }>;
        type: string;
    };
    externalReferenceMetadata?: Record<string, JsonValue> | null;
    externalReferenceAttachmentTypeId?: string;
    externalReferenceStorage?: {
        type: string;
        soType?: string;
    };
    persistableStateAttachmentState?: Record<string, JsonValue>;
    persistableStateAttachmentTypeId?: string;
}
export interface CommonAttributes {
    created_at: string;
    created_by: User;
    pushed_at: string | null;
    pushed_by: User | null;
    updated_at: string | null;
    updated_by: User | null;
}
export type AttachmentPersistedAttributes = AttachmentRequestAttributes & CommonAttributes & {
    owner: string;
};
export type AttachmentTransformedAttributes = AttachmentAttributes;
export type AttachmentSavedObjectTransformed = SavedObject<AttachmentTransformedAttributes>;
export declare const AttachmentTransformedAttributesRt: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
    comment: import("io-ts").StringC;
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.user>;
    owner: import("io-ts").StringC;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    created_at: import("io-ts").StringC;
    created_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>;
    owner: import("io-ts").StringC;
    pushed_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    pushed_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
    updated_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    updated_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
}>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.alert>;
    alertId: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
    index: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
    rule: import("io-ts").ExactC<import("io-ts").TypeC<{
        id: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        name: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    }>>;
    owner: import("io-ts").StringC;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    created_at: import("io-ts").StringC;
    created_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>;
    owner: import("io-ts").StringC;
    pushed_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    pushed_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
    updated_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    updated_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
}>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.event>;
    eventId: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
    index: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
    owner: import("io-ts").StringC;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    created_at: import("io-ts").StringC;
    created_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>;
    owner: import("io-ts").StringC;
    pushed_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    pushed_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
    updated_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    updated_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
}>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
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
    created_at: import("io-ts").StringC;
    created_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>;
    owner: import("io-ts").StringC;
    pushed_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    pushed_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
    updated_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    updated_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
}>>]>, import("io-ts").IntersectionC<[import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
    externalReferenceId: import("io-ts").StringC;
    externalReferenceStorage: import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: import("io-ts").StringC;
    externalReferenceMetadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<JsonValue, JsonValue, unknown>>]>;
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.externalReference>;
    owner: import("io-ts").StringC;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    externalReferenceId: import("io-ts").StringC;
    externalReferenceStorage: import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ExternalReferenceStorageType.savedObject>;
        soType: import("io-ts").StringC;
    }>>;
    externalReferenceAttachmentTypeId: import("io-ts").StringC;
    externalReferenceMetadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<JsonValue, JsonValue, unknown>>]>;
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.externalReference>;
    owner: import("io-ts").StringC;
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
    pushed_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    pushed_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
    updated_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    updated_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
}>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.persistableState>;
    owner: import("io-ts").StringC;
    persistableStateAttachmentTypeId: import("io-ts").StringC;
    persistableStateAttachmentState: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<JsonValue, JsonValue, unknown>>;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    created_at: import("io-ts").StringC;
    created_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>;
    owner: import("io-ts").StringC;
    pushed_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    pushed_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
    updated_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    updated_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
}>>]>]>;
export declare const AttachmentPartialAttributesRt: import("io-ts").IntersectionC<[import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").PartialC<{
    comment: import("io-ts").StringC;
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.user>;
    owner: import("io-ts").StringC;
}>>, import("io-ts").ExactC<import("io-ts").PartialC<{
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.alert>;
    alertId: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
    index: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
    rule: import("io-ts").ExactC<import("io-ts").TypeC<{
        id: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        name: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    }>>;
    owner: import("io-ts").StringC;
}>>, import("io-ts").ExactC<import("io-ts").PartialC<{
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.event>;
    eventId: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
    index: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
    owner: import("io-ts").StringC;
}>>, import("io-ts").ExactC<import("io-ts").PartialC<{
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
}>>, import("io-ts").ExactC<import("io-ts").PartialC<{
    externalReferenceId: import("io-ts").StringC;
    externalReferenceStorage: import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc>;
    }>>;
    externalReferenceAttachmentTypeId: import("io-ts").StringC;
    externalReferenceMetadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<JsonValue, JsonValue, unknown>>]>;
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.externalReference>;
    owner: import("io-ts").StringC;
}>>, import("io-ts").ExactC<import("io-ts").PartialC<{
    externalReferenceId: import("io-ts").StringC;
    externalReferenceStorage: import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ExternalReferenceStorageType.savedObject>;
        soType: import("io-ts").StringC;
    }>>;
    externalReferenceAttachmentTypeId: import("io-ts").StringC;
    externalReferenceMetadata: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<JsonValue, JsonValue, unknown>>]>;
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.externalReference>;
    owner: import("io-ts").StringC;
}>>, import("io-ts").ExactC<import("io-ts").PartialC<{
    type: import("io-ts").LiteralC<import("../../../common/types/domain").AttachmentType.persistableState>;
    owner: import("io-ts").StringC;
    persistableStateAttachmentTypeId: import("io-ts").StringC;
    persistableStateAttachmentState: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").Type<JsonValue, JsonValue, unknown>>;
}>>]>, import("io-ts").ExactC<import("io-ts").PartialC<{
    created_at: import("io-ts").StringC;
    created_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>;
    owner: import("io-ts").StringC;
    pushed_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    pushed_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
    updated_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    updated_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
}>>]>;
