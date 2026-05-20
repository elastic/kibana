export declare const inferenceSettingsSchemaV1: import("@kbn/config-schema").ObjectType<{
    features: import("@kbn/config-schema").Type<Readonly<{} & {
        endpoints: Readonly<{} & {
            id: string;
        }>[];
        feature_id: string;
    }>[]>;
}>;
