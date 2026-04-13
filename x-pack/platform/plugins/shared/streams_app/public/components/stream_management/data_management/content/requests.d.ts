import type { ContentPack, ContentPackIncludedObjects } from '@kbn/content-packs-schema';
import type { HttpSetup } from '@kbn/core/public';
import type { Streams } from '@kbn/streams-schema';
export declare function importContent({ file, http, definition, include, }: {
    file: File;
    http: HttpSetup;
    definition: Streams.all.GetResponse;
    include: ContentPackIncludedObjects;
}): Promise<unknown>;
export declare function previewContent({ http, file, definition, }: {
    http: HttpSetup;
    file: File;
    definition: Streams.all.GetResponse;
}): Promise<ContentPack>;
