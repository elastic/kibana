export declare const FIELD_QUEUE_TIME_MS = "queue_time_ms";
export declare const FIELD_EXECUTION_TIME_MS = "execution_time_ms";
export declare const runtimeFields: {
    readonly queue_time_ms: {
        readonly type: "long";
        readonly script: {
            readonly source: string;
        };
    };
    readonly execution_time_ms: {
        readonly type: "long";
        readonly script: {
            readonly source: string;
        };
    };
};
export declare const runtimeFieldKeys: string[];
