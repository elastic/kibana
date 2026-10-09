export declare const rawRulesSettingsSchema: import("@kbn/config-schema").ObjectType<{
    flapping: import("@kbn/config-schema").Type<Readonly<{} & {
        createdAt: string;
        createdBy: string | null;
        enabled: boolean;
        lookBackWindow: number;
        statusChangeThreshold: number;
        updatedAt: string;
        updatedBy: string | null;
    }> | undefined>;
    queryDelay: import("@kbn/config-schema").Type<Readonly<{} & {
        createdAt: string;
        createdBy: string | null;
        delay: number;
        updatedAt: string;
        updatedBy: string | null;
    }> | undefined>;
}>;
