export declare const rawRulesSettingsSchema: import("@kbn/config-schema").ObjectType<{
    flapping: import("@kbn/config-schema").Type<Readonly<{} & {
        enabled: boolean;
        updatedAt: string;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: string;
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | undefined>;
    queryDelay: import("@kbn/config-schema").Type<Readonly<{} & {
        updatedAt: string;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: string;
        delay: number;
    }> | undefined>;
}>;
