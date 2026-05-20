import type { Logger } from '@kbn/logging';
import { type Feature, type BaseFeature } from '@kbn/streams-schema';
import type { IgnoredFeature } from '@kbn/streams-ai';
export declare const toFeatureSummary: ({ id, title }: Feature) => {
    id: string;
    title: string;
};
export declare const toFeatureProjection: ({ id, type, subtype, title, description, properties, }: Feature) => {
    id: string;
    type: string;
    subtype: string | undefined;
    title: string | undefined;
    description: string;
    properties: Record<string, unknown>;
};
export declare function createFeatureMetadata({ featureTtlDays, runId, }: {
    featureTtlDays?: number;
    runId: string;
}): {
    status: "active";
    last_seen: string;
    expires_at: string;
    run_id: string;
};
export declare function reconcileComputedFeatures({ computedFeatures, streamName, featureTtlDays, runId, }: {
    computedFeatures: BaseFeature[];
    streamName: string;
    featureTtlDays?: number;
    runId: string;
}): Feature[];
export declare function reconcileInferredFeatures({ rawFeatures, allKnownFeatures, discoveredFeatures, ignoredFeatures, excludedFeatures, featureTtlDays, runId, logger, }: {
    rawFeatures: BaseFeature[];
    allKnownFeatures: Feature[];
    discoveredFeatures: ReadonlyArray<Feature>;
    ignoredFeatures: IgnoredFeature[];
    excludedFeatures: ReadonlyArray<Feature>;
    featureTtlDays?: number;
    runId: string;
    logger: Logger;
}): {
    newFeatures: Feature[];
    updatedFeatures: Feature[];
    codeIgnoredCount: number;
};
