import type { ContentPackIncludedObjects, ContentPackStream } from '@kbn/content-packs-schema';
export type StreamTree = ContentPackStream & {
    children: StreamTree[];
};
export declare function asTree({ root, streams, include, }: {
    root: string;
    streams: ContentPackStream[];
    include: ContentPackIncludedObjects;
}): StreamTree;
/**
 * merges the root streams provided.
 * this is not called recursively on the children as we currently
 * fail when trying to merge a child that already exists.
 */
export declare function mergeTrees({ existing, incoming, }: {
    existing: StreamTree;
    incoming: StreamTree;
}): StreamTree;
