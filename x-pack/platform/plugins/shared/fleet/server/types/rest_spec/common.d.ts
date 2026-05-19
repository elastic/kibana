import type { TypeOf } from '@kbn/config-schema';
export declare const ListWithKuerySchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number | undefined>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    sortField: import("@kbn/config-schema").Type<string | undefined>;
    sortOrder: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    showUpgradeable: import("@kbn/config-schema").Type<boolean | undefined>;
    kuery: import("@kbn/config-schema").Type<any>;
}>;
export declare const BulkRequestBodySchema: import("@kbn/config-schema").ObjectType<{
    ids: import("@kbn/config-schema").Type<string[]>;
    ignoreMissing: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export type ListWithKuery = TypeOf<typeof ListWithKuerySchema>;
