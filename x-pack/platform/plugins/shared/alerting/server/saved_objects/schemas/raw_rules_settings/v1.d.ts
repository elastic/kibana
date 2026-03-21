export declare const rawRulesSettingsSchema: import("@kbn/config-schema").ObjectType<{
    flapping: import("@kbn/config-schema").Type<Readonly<{} & {
        enabled: boolean;
        createdAt: string;
        updatedAt: string;
        createdBy: string | null;
        updatedBy: string | null;
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | undefined>;
    queryDelay: import("@kbn/config-schema").Type<Readonly<{} & {
        delay: number;
        createdAt: string;
        updatedAt: string;
        createdBy: string | null;
        updatedBy: string | null;
    }> | undefined>;
}>;
