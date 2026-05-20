export declare const validateLookbackInterval: (value: string) => {
    invalidTimeInterval: boolean;
} | null;
export declare const validateTopNBucket: ((value: number | undefined) => import("@kbn/ml-agg-utils").NumberValidationResult | null) & import("lodash").MemoizedFunction;
