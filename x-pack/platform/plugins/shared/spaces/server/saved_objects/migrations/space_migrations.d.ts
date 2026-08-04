import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import type { Space } from '../../../common';
export declare const migrateTo660: (doc: SavedObjectUnsanitizedDoc<Space>) => SavedObjectUnsanitizedDoc<Space>;
