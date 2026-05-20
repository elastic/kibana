import type { z } from '@kbn/zod/v4';
export interface ElasticsearchAssets {
    ingestPipeline?: string | undefined;
    componentTemplates: string[];
    indexTemplate: string;
    dataStream: string;
}
export declare const elasticsearchAssetsSchema: z.Schema<ElasticsearchAssets>;
