import { type BaseFeature, type Feature } from './feature';
export declare class FeatureAccumulator {
    private readonly byUuid;
    private readonly byLowerId;
    private readonly fromStorage;
    constructor(initialFeatures?: Feature[]);
    add(feature: Feature): void;
    update(feature: Feature): void;
    findDuplicate(candidate: BaseFeature): Feature | undefined;
    isStoredFeature(feature: Feature): boolean;
    promoteFromStorage(featureUuid: string): void;
    getAll(): Feature[];
    getDiscovered(): Feature[];
    getTopRanked(limit: number): Feature[];
    get length(): number;
}
