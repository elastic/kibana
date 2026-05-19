import { type FC } from 'react';
import type { TagSelectorComponentProps } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { TagsCapabilities } from '../../../common';
import type { ITagsCache } from '../../services';
import type { CreateModalOpener } from '../edition_modal';
interface GetConnectedTagSelectorOptions {
    cache: ITagsCache;
    capabilities: TagsCapabilities;
    openCreateModal: CreateModalOpener;
}
export declare const getConnectedTagSelectorComponent: ({ cache, capabilities, openCreateModal, }: GetConnectedTagSelectorOptions) => FC<TagSelectorComponentProps>;
export {};
