import * as t from 'io-ts';
declare const rollingTimeWindowTypeSchema: t.LiteralC<"rolling">;
declare const rollingTimeWindowSchema: t.TypeC<{
    duration: t.Type<import("../models").Duration, string, unknown>;
    type: t.LiteralC<"rolling">;
}>;
declare const calendarAlignedTimeWindowTypeSchema: t.LiteralC<"calendarAligned">;
declare const calendarAlignedTimeWindowSchema: t.TypeC<{
    duration: t.Type<import("../models").Duration, string, unknown>;
    type: t.LiteralC<"calendarAligned">;
}>;
declare const timeWindowTypeSchema: t.UnionC<[t.LiteralC<"rolling">, t.LiteralC<"calendarAligned">]>;
declare const timeWindowSchema: t.UnionC<[t.TypeC<{
    duration: t.Type<import("../models").Duration, string, unknown>;
    type: t.LiteralC<"rolling">;
}>, t.TypeC<{
    duration: t.Type<import("../models").Duration, string, unknown>;
    type: t.LiteralC<"calendarAligned">;
}>]>;
export { rollingTimeWindowSchema, rollingTimeWindowTypeSchema, calendarAlignedTimeWindowSchema, calendarAlignedTimeWindowTypeSchema, timeWindowSchema, timeWindowTypeSchema, };
