import type { AttachmentPersistedAttributes } from '../../../common/types/attachments_v1';
import type { UnifiedAttachmentAttributes } from '../../../common/types/attachments_v2';
import { type AttachmentPatchAttributesV2, type AttachmentMode } from '../../../../common/types/domain/attachment/v2';
export type ModeTransformedAttributes = {
    isUnified: true;
    attributes: UnifiedAttachmentAttributes;
} | {
    isUnified: false;
    attributes: AttachmentPersistedAttributes;
};
export declare function transformAttributesForMode({ attributes, mode, }: {
    attributes: UnifiedAttachmentAttributes | AttachmentPersistedAttributes | AttachmentPatchAttributesV2;
    mode: AttachmentMode;
}): ModeTransformedAttributes;
export declare function getTransformerForPatchAttributes(decodedAttributes: AttachmentPatchAttributesV2, requestWithoutType: boolean): import("../../../common/attachments/base").AttachmentTypeTransformer<AttachmentPersistedAttributes, (({
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
})) & {
    created_at: string;
    created_by: {
        email: string | null | undefined;
        full_name: string | null | undefined;
        username: string | null | undefined;
    } & {
        profile_uid?: string | undefined;
    };
    owner: string;
    pushed_at: string | null;
    pushed_by: ({
        email: string | null | undefined;
        full_name: string | null | undefined;
        username: string | null | undefined;
    } & {
        profile_uid?: string | undefined;
    }) | null;
    updated_at: string | null;
    updated_by: ({
        email: string | null | undefined;
        full_name: string | null | undefined;
        username: string | null | undefined;
    } & {
        profile_uid?: string | undefined;
    }) | null;
}>;
