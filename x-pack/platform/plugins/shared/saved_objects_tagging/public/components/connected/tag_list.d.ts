import { type FC } from 'react';
import type { TagListComponentProps } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ITagsCache } from '../../services';
interface GetConnectedTagListOptions {
    cache: ITagsCache;
}
export declare const getConnectedTagListComponent: ({ cache, }: GetConnectedTagListOptions) => FC<TagListComponentProps>;
export {};
