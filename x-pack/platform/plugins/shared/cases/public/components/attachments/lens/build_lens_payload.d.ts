import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { LensSavedObjectAttachmentPayload } from '../../../../common/types/domain_zod/attachment/lens/v2';
export type LensPayload = Omit<LensSavedObjectAttachmentPayload, 'owner'>;
export declare const buildLensPayload: ({ id, title, contentManagement, timeRange, }: {
    id: string;
    title: string;
    contentManagement: ContentManagementPublicStart;
    timeRange?: TimeRange;
}) => Promise<LensPayload>;
