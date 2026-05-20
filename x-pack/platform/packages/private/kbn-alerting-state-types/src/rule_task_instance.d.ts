import type * as t from 'io-ts';
export declare enum ActionsCompletion {
    COMPLETE = "complete",
    PARTIAL = "partial"
}
export declare const ruleParamsSchema: t.IntersectionC<[t.TypeC<{
    alertId: t.StringC;
}>, t.PartialC<{
    spaceId: t.StringC;
}>]>;
export type RuleTaskParams = t.TypeOf<typeof ruleParamsSchema>;
