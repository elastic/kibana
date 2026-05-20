import type { ContentPackStream } from '@kbn/content-packs-schema';
import type { StreamTree } from './tree';
export declare function prepareStreamsForImport({ existing, incoming, }: {
    existing: StreamTree;
    incoming: StreamTree;
}): ContentPackStream[];
