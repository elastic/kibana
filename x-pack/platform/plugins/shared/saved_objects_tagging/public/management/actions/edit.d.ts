import type { ITagInternalClient } from '../../services/tags';
import type { StartServices } from '../../types';
import type { TagAction } from './types';
interface GetEditActionOptions extends StartServices {
    tagClient: ITagInternalClient;
    fetchTags: () => Promise<void>;
}
export declare const getEditAction: ({ tagClient, fetchTags, ...startServices }: GetEditActionOptions) => TagAction;
export {};
