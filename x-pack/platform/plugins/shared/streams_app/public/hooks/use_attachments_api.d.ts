import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
export declare const useAttachmentsApi: ({ name }: {
    name: string;
}) => {
    addAttachments: (attachments: Attachment[]) => Promise<void>;
    removeAttachments: (attachments: Attachment[]) => Promise<void>;
};
