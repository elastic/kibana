import * as t from 'io-ts';
import type { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
declare const bulkPurgePolicy: t.UnionC<[t.TypeC<{
    purgeType: t.LiteralC<"fixed_age">;
    age: t.Type<import("../../models").Duration, string, unknown>;
}>, t.TypeC<{
    purgeType: t.LiteralC<"fixed_time">;
    timestamp: t.Type<Date, string, unknown>;
}>]>;
declare const bulkPurgeRollupSchema: t.TypeC<{
    body: t.IntersectionC<[t.TypeC<{
        list: t.ArrayC<t.StringC>;
        purgePolicy: t.UnionC<[t.TypeC<{
            purgeType: t.LiteralC<"fixed_age">;
            age: t.Type<import("../../models").Duration, string, unknown>;
        }>, t.TypeC<{
            purgeType: t.LiteralC<"fixed_time">;
            timestamp: t.Type<Date, string, unknown>;
        }>]>;
    }>, t.PartialC<{
        force: t.BooleanC;
    }>]>;
}>;
interface BulkPurgeRollupResponse {
    taskId?: DeleteByQueryResponse['task'];
}
type BulkPurgePolicyInput = t.OutputOf<typeof bulkPurgePolicy>;
type BulkPurgeRollupInput = t.OutputOf<typeof bulkPurgeRollupSchema.props.body>;
type BulkPurgeRollupParams = t.TypeOf<typeof bulkPurgeRollupSchema.props.body>;
export type { BulkPurgeRollupResponse, BulkPurgePolicyInput, BulkPurgeRollupInput, BulkPurgeRollupParams, };
export { bulkPurgeRollupSchema };
