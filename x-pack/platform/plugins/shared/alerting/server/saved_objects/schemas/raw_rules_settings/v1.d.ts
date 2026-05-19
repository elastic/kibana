export declare const rawRulesSettingsSchema: import("@kbn/config-schema").ObjectType<{
    flapping: import("@kbn/config-schema").Type<Readonly<{} & {
        enabled: boolean;
        createdBy: string | null;
        updatedAt: string;
        createdAt: string;
        updatedBy: string | null;
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | undefined>;
    queryDelay: import("@kbn/config-schema").Type<Readonly<{} & {
        delay: number;
        createdBy: string | null;
        updatedAt: string;
        createdAt: string;
        updatedBy: string | null;
    }> | undefined>;
}>;
