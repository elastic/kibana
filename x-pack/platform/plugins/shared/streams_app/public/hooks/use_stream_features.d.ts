import { type Feature, type Streams } from '@kbn/streams-schema';
export declare const useStreamFeatures: (definition: Streams.all.Definition, deps?: unknown[]) => {
    features: ({
        type: string;
        id: string;
        stream_name: string;
        description: string;
        properties: Record<string, unknown>;
        confidence: number;
        evidence?: string[] | undefined;
        title?: string | undefined;
        meta?: Record<string, any> | undefined;
        subtype?: string | undefined;
        tags?: string[] | undefined;
    } & {
        status: "stale" | "active" | "expired";
        uuid: string;
        last_seen: string;
        expires_at?: string | undefined;
    })[];
    featuresLoading: boolean;
    refreshFeatures: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<{
        features: Feature[];
    }, Error>>;
    error: Error | null;
};
