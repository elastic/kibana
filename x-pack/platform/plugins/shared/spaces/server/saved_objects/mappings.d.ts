export declare const SpacesSavedObjectMappings: Readonly<{
    readonly dynamic: false;
    readonly properties: Readonly<{
        readonly name: Readonly<{
            readonly type: "text";
            readonly fields: Readonly<{
                readonly keyword: Readonly<{
                    readonly type: "keyword";
                    readonly ignore_above: 2048;
                }>;
            }>;
        }>;
        readonly solution: Readonly<{
            readonly type: "keyword";
        }>;
        readonly disabledFeatures: Readonly<{
            readonly type: "keyword";
        }>;
    }>;
}>;
export declare const UsageStatsMappings: Readonly<{
    dynamic: false;
    properties: Readonly<{}>;
}>;
