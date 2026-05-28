export declare enum IndexLifecyclePhaseSelectOption {
    All = "all",
    Hot = "hot",
    Warm = "warm",
    Cold = "cold",
    Frozen = "frozen"
}
export declare const indexLifeCyclePhaseToDataTier: {
    readonly hot: "data_hot";
    readonly warm: "data_warm";
    readonly cold: "data_cold";
    readonly frozen: "data_frozen";
};
export type DataTier = (typeof indexLifeCyclePhaseToDataTier)[keyof typeof indexLifeCyclePhaseToDataTier];
