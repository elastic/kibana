import * as t from 'io-ts';
declare const bulkSnapshotRequestItemSchema: t.IntersectionC<[t.TypeC<{
    id: t.Type<string, string, unknown>;
}>, t.PartialC<{
    instanceId: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
}>]>;
declare const snapshotSummarySchema: t.TypeC<{
    status: t.UnionC<[t.LiteralC<"NO_DATA">, t.LiteralC<"HEALTHY">, t.LiteralC<"DEGRADING">, t.LiteralC<"VIOLATED">]>;
    sliValue: t.UnionC<[t.NumberC, t.NullC]>;
    errorBudget: t.TypeC<{
        initial: t.NumberC;
        consumed: t.UnionC<[t.NumberC, t.NullC]>;
        remaining: t.UnionC<[t.NumberC, t.NullC]>;
    }>;
    good: t.NumberC;
    total: t.NumberC;
}>;
declare const snapshotResultSchema: t.IntersectionC<[t.TypeC<{
    id: t.StringC;
    instanceId: t.StringC;
}>, t.UnionC<[t.TypeC<{
    summary: t.TypeC<{
        status: t.UnionC<[t.LiteralC<"NO_DATA">, t.LiteralC<"HEALTHY">, t.LiteralC<"DEGRADING">, t.LiteralC<"VIOLATED">]>;
        sliValue: t.UnionC<[t.NumberC, t.NullC]>;
        errorBudget: t.TypeC<{
            initial: t.NumberC;
            consumed: t.UnionC<[t.NumberC, t.NullC]>;
            remaining: t.UnionC<[t.NumberC, t.NullC]>;
        }>;
        good: t.NumberC;
        total: t.NumberC;
    }>;
}>, t.TypeC<{
    error: t.TypeC<{
        statusCode: t.NumberC;
        message: t.StringC;
    }>;
}>]>]>;
declare const bulkSnapshotParamsSchema: t.TypeC<{
    body: t.TypeC<{
        at: t.Type<Date, string, unknown>;
        requests: t.ArrayC<t.IntersectionC<[t.TypeC<{
            id: t.Type<string, string, unknown>;
        }>, t.PartialC<{
            instanceId: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
        }>]>>;
    }>;
}>;
declare const snapshotResponseSchema: t.TypeC<{
    at: t.StringC;
    results: t.ArrayC<t.IntersectionC<[t.TypeC<{
        id: t.StringC;
        instanceId: t.StringC;
    }>, t.UnionC<[t.TypeC<{
        summary: t.TypeC<{
            status: t.UnionC<[t.LiteralC<"NO_DATA">, t.LiteralC<"HEALTHY">, t.LiteralC<"DEGRADING">, t.LiteralC<"VIOLATED">]>;
            sliValue: t.UnionC<[t.NumberC, t.NullC]>;
            errorBudget: t.TypeC<{
                initial: t.NumberC;
                consumed: t.UnionC<[t.NumberC, t.NullC]>;
                remaining: t.UnionC<[t.NumberC, t.NullC]>;
            }>;
            good: t.NumberC;
            total: t.NumberC;
        }>;
    }>, t.TypeC<{
        error: t.TypeC<{
            statusCode: t.NumberC;
            message: t.StringC;
        }>;
    }>]>]>>;
}>;
declare const getSnapshotParamsSchema: t.TypeC<{
    path: t.TypeC<{
        id: t.Type<string, string, unknown>;
    }>;
    query: t.IntersectionC<[t.TypeC<{
        at: t.Type<Date, string, unknown>;
    }>, t.PartialC<{
        instanceId: t.UnionC<[t.LiteralC<"*">, t.StringC]>;
    }>]>;
}>;
type BulkSnapshotRequestItem = t.TypeOf<typeof bulkSnapshotRequestItemSchema>;
type SnapshotSummary = t.TypeOf<typeof snapshotSummarySchema>;
type SnapshotResult = t.TypeOf<typeof snapshotResultSchema>;
type BulkSnapshotParams = t.TypeOf<typeof bulkSnapshotParamsSchema.props.body>;
type GetSnapshotParams = t.TypeOf<typeof getSnapshotParamsSchema>;
type SnapshotResponse = t.TypeOf<typeof snapshotResponseSchema>;
export { bulkSnapshotParamsSchema, bulkSnapshotRequestItemSchema, getSnapshotParamsSchema, snapshotResponseSchema, snapshotResultSchema, snapshotSummarySchema, };
export type { BulkSnapshotParams, BulkSnapshotRequestItem, GetSnapshotParams, SnapshotResponse, SnapshotResult, SnapshotSummary, };
