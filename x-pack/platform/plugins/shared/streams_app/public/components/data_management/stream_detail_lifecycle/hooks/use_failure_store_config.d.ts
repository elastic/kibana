import { Streams } from '@kbn/streams-schema';
import type { FailureStoreFormData } from '@kbn/failure-store-modal';
export declare function transformFailureStoreConfig(update: FailureStoreFormData): {
    inherit: {};
    disabled?: undefined;
    lifecycle?: undefined;
} | {
    disabled: {};
    inherit?: undefined;
    lifecycle?: undefined;
} | {
    lifecycle: {
        disabled: {};
        enabled?: undefined;
    };
    inherit?: undefined;
    disabled?: undefined;
} | {
    lifecycle: {
        enabled: {
            data_retention: string | undefined;
        };
        disabled?: undefined;
    };
    inherit?: undefined;
    disabled?: undefined;
};
export declare function useFailureStoreConfig(definition: Streams.ingest.all.GetResponse): {
    defaultRetentionPeriod: string | undefined;
    customRetentionPeriod: string | undefined;
    failureStoreEnabled: boolean;
    inheritOptions: {
        canShowInherit: boolean;
        isWired: boolean;
        isCurrentlyInherited: boolean;
    };
    retentionDisabled: boolean;
};
