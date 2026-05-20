import type { ContentPackStream } from '@kbn/content-packs-schema';
import type { StreamTree } from './tree';
export declare function prepareStreamsForExport({ tree }: {
    tree: StreamTree;
}): ContentPackStream[];
