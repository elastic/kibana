export declare const cloudOnboardingQuerySchema: import("@kbn/config-schema").Type<Readonly<{
    next?: string | undefined;
    onboarding_token?: string | undefined;
    security?: Readonly<{
        migration?: Readonly<{
            type?: "other" | "splunk" | undefined;
        } & {
            value: boolean;
        }> | undefined;
    } & {
        use_case: "cloud" | "edr" | "other" | "siem";
    }> | undefined;
    resource_data?: Readonly<{
        project?: Readonly<{
            search?: Readonly<{} & {
                type: "general" | "timeseries" | "vector";
            }> | undefined;
        } & {}> | undefined;
        deployment?: Readonly<{
            id?: string | undefined;
            name?: string | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
} & {}> | undefined>;
