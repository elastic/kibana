export declare const SPACE_ID_REGEX: RegExp;
export declare const solutionSchema: import("@kbn/config-schema").Type<"security" | "oblt" | "es" | "classic">;
export declare const getSpaceSchema: (isServerless: boolean) => import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    initials: import("@kbn/config-schema").Type<string | undefined>;
    color: import("@kbn/config-schema").Type<string | undefined>;
    disabledFeatures: import("@kbn/config-schema").Type<string[]>;
    _reserved: import("@kbn/config-schema").Type<boolean | undefined>;
    imageUrl: import("@kbn/config-schema").Type<string | undefined>;
    projectRouting: import("@kbn/config-schema").Type<string | undefined>;
}>;
