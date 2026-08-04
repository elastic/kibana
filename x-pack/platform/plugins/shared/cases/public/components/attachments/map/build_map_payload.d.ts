import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { MapAttachmentPayload } from '../../../../common/types/domain_zod/attachment/map/v2';
export type MapPayload = Omit<MapAttachmentPayload, 'owner'>;
export declare const buildMapPayload: ({ contentManagement, id, title, }: {
    contentManagement: ContentManagementPublicStart;
    id: string;
    title: string;
}) => Promise<MapPayload>;
