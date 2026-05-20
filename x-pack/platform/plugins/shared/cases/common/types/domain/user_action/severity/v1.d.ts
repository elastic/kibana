import * as rt from 'io-ts';
export declare const SeverityUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    severity: rt.UnionC<[rt.LiteralC<import("../../case/v1").CaseSeverity.LOW>, rt.LiteralC<import("../../case/v1").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../case/v1").CaseSeverity.HIGH>, rt.LiteralC<import("../../case/v1").CaseSeverity.CRITICAL>]>;
}>>;
export declare const SeverityUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"severity">;
    payload: rt.ExactC<rt.TypeC<{
        severity: rt.UnionC<[rt.LiteralC<import("../../case/v1").CaseSeverity.LOW>, rt.LiteralC<import("../../case/v1").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../case/v1").CaseSeverity.HIGH>, rt.LiteralC<import("../../case/v1").CaseSeverity.CRITICAL>]>;
    }>>;
}>>;
