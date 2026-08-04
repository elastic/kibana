import type { LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import type { UnifiedValueAttachmentPayload } from '../../../../../common/types/domain';
import type { LensProps } from '../types';
type UnifiedValueAttachmentWithoutOwner = Omit<UnifiedValueAttachmentPayload, 'owner'>;
export declare const getLensCaseAttachment: ({ timeRange, attributes, metadata, }: {
    timeRange: LensProps["timeRange"];
    attributes: LensSavedObjectAttributes;
    metadata?: LensProps["metadata"];
}) => UnifiedValueAttachmentWithoutOwner;
export {};
