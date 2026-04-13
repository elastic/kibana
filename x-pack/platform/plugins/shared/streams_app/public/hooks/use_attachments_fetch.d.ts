import type { AttachmentType } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
export declare const useAttachmentsFetch: ({ streamName, filters, }: {
    streamName: string;
    filters?: {
        query?: string;
        attachmentTypes?: AttachmentType[];
        tags?: string[];
    };
}) => import("@kbn/react-hooks").AbortableAsyncState<Promise<import("../../../streams/server/routes/attachments/route").ListAttachmentsResponse>>;
