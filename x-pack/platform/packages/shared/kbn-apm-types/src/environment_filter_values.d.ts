import type { Environment } from './environment_rt';
export declare const ENVIRONMENT_ALL_VALUE: "ENVIRONMENT_ALL";
export declare const ENVIRONMENT_NOT_DEFINED_VALUE: "ENVIRONMENT_NOT_DEFINED";
export declare const allOptionText: string;
export declare function getEnvironmentLabel(environment: string): string;
export declare const ENVIRONMENT_ALL: {
    value: "ENVIRONMENT_ALL";
    label: string;
};
export declare const ENVIRONMENT_NOT_DEFINED: {
    value: "ENVIRONMENT_NOT_DEFINED";
    label: string;
};
export declare function isEnvironmentDefined(environment: string): boolean | "";
export declare function getEnvironmentEsField(environment: string): {
    "service.environment"?: undefined;
} | {
    "service.environment": string;
};
export declare function getEnvironmentKuery(environment: string): string | null;
export declare function getNextEnvironmentUrlParam({ requestedEnvironment, currentEnvironmentUrlParam, }: {
    requestedEnvironment?: string;
    currentEnvironmentUrlParam: Environment;
}): string;
