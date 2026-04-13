import type { Feature } from '@kbn/streams-schema';
interface FetchFeaturesResult {
    features: Feature[];
}
export declare const useFetchFeatures: () => import("@kbn/react-query").UseQueryResult<FetchFeaturesResult | undefined, Error>;
export {};
