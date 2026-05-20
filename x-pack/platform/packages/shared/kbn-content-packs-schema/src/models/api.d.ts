import type { z } from '@kbn/zod/v4';
export interface ContentPackIncludeAll {
    objects: {
        all: {};
    };
}
export type ContentPackIncludedObjects = ContentPackIncludeAll | {
    objects: {
        mappings: boolean;
        queries: Array<{
            id: string;
        }>;
        routing: Array<{
            destination: string;
        } & ContentPackIncludedObjects>;
    };
};
export declare const isIncludeAll: (value: ContentPackIncludedObjects) => value is ContentPackIncludeAll;
export declare const contentPackIncludedObjectsSchema: z.Schema<ContentPackIncludedObjects>;
