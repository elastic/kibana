import { type TypeOf } from '@kbn/config-schema';
export declare const dataViewCreateQuerySchema: import("@kbn/config-schema").ObjectType<{
    createDataView: import("@kbn/config-schema").Type<boolean>;
    timeFieldName: import("@kbn/config-schema").Type<string | undefined>;
}>;
export type DataViewCreateQuerySchema = TypeOf<typeof dataViewCreateQuerySchema>;
