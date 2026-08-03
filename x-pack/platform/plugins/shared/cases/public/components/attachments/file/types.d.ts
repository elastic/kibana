import type * as rt from 'io-ts';
import type { SingleFileAttachmentMetadataRt } from '../../../../common/types/domain';
export type DownloadableFile = rt.TypeOf<typeof SingleFileAttachmentMetadataRt> & {
    id: string;
};
