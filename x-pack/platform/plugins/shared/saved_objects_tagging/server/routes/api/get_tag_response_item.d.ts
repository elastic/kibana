import type { SavedObject } from '@kbn/core/server';
import type { TagAttributes } from '../../../common/types';
import type { TagResponseItem } from './schemas';
export declare const getTagResponseItem: (savedObject: SavedObject<TagAttributes>) => TagResponseItem;
