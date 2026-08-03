import * as rt from 'io-ts';
export declare const SeverityUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    severity: rt.UnionC<[rt.LiteralC<import("../..").CaseSeverity.LOW>, rt.LiteralC<import("../..").CaseSeverity.MEDIUM>, rt.LiteralC<import("../..").CaseSeverity.HIGH>, rt.LiteralC<import("../..").CaseSeverity.CRITICAL>]>;
}>>;
export declare const SeverityUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"severity">;
    payload: rt.ExactC<rt.TypeC<{
        severity: rt.UnionC<[rt.LiteralC<import("../..").CaseSeverity.LOW>, rt.LiteralC<import("../..").CaseSeverity.MEDIUM>, rt.LiteralC<import("../..").CaseSeverity.HIGH>, rt.LiteralC<import("../..").CaseSeverity.CRITICAL>]>;
    }>>;
}>>;
