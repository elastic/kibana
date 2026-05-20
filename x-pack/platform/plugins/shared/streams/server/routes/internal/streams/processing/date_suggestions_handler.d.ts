import type { z } from '@kbn/zod/v4';
import type { IScopedClusterClient } from '@kbn/core/server';
export interface ProcessingDateSuggestionsParams {
    path: {
        name: string;
    };
    body: {
        dates: unknown[];
    };
}
export interface ProcessingDateSuggestionsHandlerDeps {
    params: ProcessingDateSuggestionsParams;
    scopedClusterClient: IScopedClusterClient;
}
export declare const processingDateSuggestionsSchema: z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        dates: z.ZodArray<z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const handleProcessingDateSuggestions: ({ params, scopedClusterClient, }: ProcessingDateSuggestionsHandlerDeps) => Promise<{
    formats: string[];
}>;
