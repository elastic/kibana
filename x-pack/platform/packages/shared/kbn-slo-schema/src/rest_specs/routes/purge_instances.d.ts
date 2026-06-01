import * as t from 'io-ts';
declare const purgeInstancesParamsSchema: t.TypeC<{
    body: t.PartialC<{
        list: t.ArrayC<t.Type<string, string, unknown>>;
        staleDuration: t.Type<import("../../models").Duration, string, unknown>;
        force: t.BooleanC;
    }>;
}>;
interface PurgeInstancesResponse {
    taskId?: string;
}
type PurgeInstancesInput = t.OutputOf<typeof purgeInstancesParamsSchema.props.body>;
type PurgeInstancesParams = t.TypeOf<typeof purgeInstancesParamsSchema.props.body>;
declare const purgeInstancesStatusParamsSchema: t.TypeC<{
    path: t.TypeC<{
        taskId: t.StringC;
    }>;
}>;
interface PurgeInstancesStatusResponse {
    completed: boolean;
    error?: string;
    status?: {
        total: number;
        deleted: number;
        batches: number;
        start_time_in_millis: number;
        running_time_in_nanos: number;
    };
}
export { purgeInstancesParamsSchema, purgeInstancesStatusParamsSchema };
export type { PurgeInstancesInput, PurgeInstancesParams, PurgeInstancesResponse, PurgeInstancesStatusResponse, };
