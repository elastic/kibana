import type { OverlayRef } from '@kbn/core/public';
import type { Tag, TagAttributes } from '../../../common/types';
import type { ITagInternalClient } from '../../services';
import type { StartServices } from '../../types';
interface GetModalOpenerOptions extends StartServices {
    tagClient: ITagInternalClient;
}
interface OpenCreateModalOptions {
    defaultValues?: Partial<TagAttributes>;
    onCreate: (tag: Tag) => void;
}
export type CreateModalOpener = (options: OpenCreateModalOptions) => Promise<OverlayRef>;
export declare const getCreateModalOpener: ({ overlays, tagClient, notifications, rendering }: GetModalOpenerOptions) => CreateModalOpener;
interface OpenEditModalOptions {
    tagId: string;
    onUpdate: (tag: Tag) => void;
}
export declare const getEditModalOpener: ({ overlays, tagClient, notifications, rendering }: GetModalOpenerOptions) => ({ tagId, onUpdate }: OpenEditModalOptions) => Promise<OverlayRef>;
export {};
