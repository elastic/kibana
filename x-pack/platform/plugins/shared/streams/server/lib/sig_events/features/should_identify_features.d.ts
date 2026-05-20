import type { FeatureClient } from '../../streams/feature/feature_client';
export interface ShouldIdentifyFeaturesResult {
    shouldIdentify: boolean;
}
export declare function shouldIdentifyFeatures({ featureClient, streamName, thresholdHours, }: {
    featureClient: FeatureClient;
    streamName: string;
    thresholdHours: number;
}): Promise<ShouldIdentifyFeaturesResult>;
