import type { IBasePath } from '@kbn/core/public';
import type { TagWithRelations } from '../../../common/types';
/**
 * Returns the url to use to redirect to the SavedObject management section with given tag
 * already selected in the query/filter bar.
 */
export declare const getTagConnectionsUrl: (tag: TagWithRelations, basePath: IBasePath) => string;
