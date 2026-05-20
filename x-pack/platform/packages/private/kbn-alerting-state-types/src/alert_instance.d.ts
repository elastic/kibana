import type * as t from 'io-ts';
declare const contextSchema: t.RecordC<t.StringC, t.UnknownC>;
export type AlertInstanceContext = t.TypeOf<typeof contextSchema>;
export {};
