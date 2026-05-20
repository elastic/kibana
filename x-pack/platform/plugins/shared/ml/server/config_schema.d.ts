export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    ad: import("@kbn/config-schema").Type<Readonly<{} & {
        enabled: boolean;
    }> | undefined>;
    dfa: import("@kbn/config-schema").Type<Readonly<{} & {
        enabled: boolean;
    }> | undefined>;
    nlp: import("@kbn/config-schema").Type<Readonly<{
        modelDeployment?: Readonly<{} & {
            allowStaticAllocations: boolean;
            vCPURange: Readonly<{} & {
                low: Readonly<{
                    static?: number | undefined;
                } & {
                    min: number;
                    max: number;
                    maxThreads: number;
                }>;
                medium: Readonly<{
                    static?: number | undefined;
                } & {
                    min: number;
                    max: number;
                    maxThreads: number;
                }>;
                high: Readonly<{
                    static?: number | undefined;
                } & {
                    min: number;
                    max: number;
                    maxThreads: number;
                }>;
            }>;
        }> | undefined;
    } & {
        enabled: boolean;
    }> | undefined>;
    compatibleModuleType: import("@kbn/config-schema").Type<"observability" | "search" | "security" | undefined>;
    experimental: import("@kbn/config-schema").Type<Readonly<{
        ruleFormV2?: Readonly<{} & {
            enabled: boolean;
        }> | undefined;
    } & {}> | undefined>;
}>;
