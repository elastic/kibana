import type { Type } from '@kbn/config-schema';
export declare const ListResponseSchema: (itemSchema: Type<any>) => import("@kbn/config-schema").ObjectType<{
    items: Type<any[]>;
    total: Type<number>;
    page: Type<number>;
    perPage: Type<number>;
}>;
