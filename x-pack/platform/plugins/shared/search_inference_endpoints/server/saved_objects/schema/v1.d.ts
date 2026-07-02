export declare const inferenceSettingsSchemaV1: import("@kbn/config-schema").ObjectType<{
    features: import("@kbn/config-schema").Type<Readonly<{} & {
        feature_id: string;
        endpoints: Readonly<{} & {
            id: string;
        }>[];
    }>[]>;
}>;
