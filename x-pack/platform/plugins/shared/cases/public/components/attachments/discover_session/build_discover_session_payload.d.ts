import type { DiscoverSessionAttachmentPayload } from '../../../../common/types/domain_zod/attachment/saved_object/v2';
export type DiscoverSessionPayload = Omit<DiscoverSessionAttachmentPayload, 'owner'>;
export declare const buildDiscoverSessionPayload: ({ id, title, }: {
    id: string;
    title: string;
}) => DiscoverSessionPayload;
