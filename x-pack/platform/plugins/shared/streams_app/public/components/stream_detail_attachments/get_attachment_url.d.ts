import type { LocatorClient } from '@kbn/share-plugin/common/url_service';
import type { AttachmentType } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
export declare function getAttachmentUrl(redirectId: string, type: AttachmentType, locatorsService: LocatorClient, timeRange: {
    from: string;
    to: string;
}): string | undefined;
