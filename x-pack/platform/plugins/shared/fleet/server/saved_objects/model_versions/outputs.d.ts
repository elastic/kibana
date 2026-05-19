import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { Output } from '../../../common';
export declare const backfillOutputPolicyToV7: SavedObjectModelDataBackfillFn<Output & {
    topics?: Array<{
        topic: string;
        when?: {
            type?: string;
            condition?: string;
        };
    }>;
}, Output>;
