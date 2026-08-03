import * as rt from 'io-ts';
export declare const CaseObservableBaseRt: rt.ExactC<rt.TypeC<{
    typeKey: rt.StringC;
    value: rt.StringC;
    description: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>;
export declare const CaseObservableRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    createdAt: rt.StringC;
    updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    typeKey: rt.StringC;
    value: rt.StringC;
    description: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>;
export declare const CaseObservableTypeRt: rt.ExactC<rt.TypeC<{
    key: rt.StringC;
    label: rt.StringC;
}>>;
export type Observable = rt.TypeOf<typeof CaseObservableRt>;
export type ObservableType = rt.TypeOf<typeof CaseObservableTypeRt>;
