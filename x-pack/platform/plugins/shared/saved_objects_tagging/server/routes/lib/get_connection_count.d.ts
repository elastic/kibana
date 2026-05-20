import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Tag, TagWithRelations } from '../../../common/types';
export declare const addConnectionCount: (tags: Tag[], targetTypes: string[], client: SavedObjectsClientContract) => Promise<TagWithRelations[]>;
