import * as rt from 'io-ts';
export declare const AllCasesURLQueryParamsRt: rt.ExactC<rt.PartialC<{
    search: rt.StringC;
    severity: rt.ArrayC<rt.UnionC<[rt.LiteralC<import("../../../common/types/domain").CaseSeverity.LOW>, rt.LiteralC<import("../../../common/types/domain").CaseSeverity.MEDIUM>, rt.LiteralC<import("../../../common/types/domain").CaseSeverity.HIGH>, rt.LiteralC<import("../../../common/types/domain").CaseSeverity.CRITICAL>]>>;
    status: rt.ArrayC<rt.UnionC<[rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, rt.LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, rt.LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>>;
    tags: rt.ArrayC<rt.StringC>;
    category: rt.ArrayC<rt.StringC>;
    assignees: rt.ArrayC<rt.UnionC<[rt.StringC, rt.NullC]>>;
    customFields: rt.RecordC<rt.StringC, rt.ArrayC<rt.StringC>>;
    from: rt.StringC;
    to: rt.StringC;
    sortOrder: rt.UnionC<[rt.LiteralC<"asc">, rt.LiteralC<"desc">]>;
    sortField: rt.UnionC<[rt.LiteralC<"closedAt">, rt.LiteralC<"createdAt">, rt.LiteralC<"updatedAt">, rt.LiteralC<"severity">, rt.LiteralC<"status">, rt.LiteralC<"title">, rt.LiteralC<"category">]>;
    page: rt.NumberC;
    perPage: rt.NumberC;
}>>;
export declare const validateSchema: <T extends rt.Mixed>(obj: unknown, schema: T) => rt.TypeOf<T> | null;
