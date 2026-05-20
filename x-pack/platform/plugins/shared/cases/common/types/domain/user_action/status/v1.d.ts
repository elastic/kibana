import * as rt from 'io-ts';
export declare const StatusUserActionPayloadRt: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
    status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
}>, rt.PartialC<{
    closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
    syncedAlertCount: rt.NumberC;
}>]>>;
export declare const StatusUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"status">;
    payload: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
        status: rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
    }>, rt.PartialC<{
        closeReason: rt.UnionC<[rt.UnionC<[rt.LiteralC<"false_positive">, rt.LiteralC<"duplicate">, rt.LiteralC<"true_positive">, rt.LiteralC<"benign_positive">, rt.LiteralC<"automated_closure">, rt.LiteralC<"other">]>, rt.StringC]>;
        syncedAlertCount: rt.NumberC;
    }>]>>;
}>>;
