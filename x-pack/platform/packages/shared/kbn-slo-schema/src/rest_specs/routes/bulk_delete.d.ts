import * as t from 'io-ts';
declare const bulkDeleteParamsSchema: t.TypeC<{
    body: t.TypeC<{
        list: t.ArrayC<t.Type<string, string, unknown>>;
    }>;
}>;
declare const bulkDeleteStatusParamsSchema: t.TypeC<{
    path: t.TypeC<{
        taskId: t.StringC;
    }>;
}>;
type BulkDeleteInput = t.OutputOf<typeof bulkDeleteParamsSchema.props.body>;
type BulkDeleteParams = t.TypeOf<typeof bulkDeleteParamsSchema.props.body>;
interface BulkDeleteResponse {
    taskId: string;
}
interface BulkDeleteResult {
    id: string;
    success: boolean;
    error?: string;
}
interface BulkDeleteStatusResponse {
    isDone: boolean;
    results?: BulkDeleteResult[];
    error?: string;
}
export type { BulkDeleteInput, BulkDeleteParams, BulkDeleteResponse, BulkDeleteResult, BulkDeleteStatusResponse, };
export { bulkDeleteParamsSchema, bulkDeleteStatusParamsSchema };
