import * as rt from 'io-ts';
/**
 * Observables
 */
export declare const ObservablePostRt: rt.ExactC<rt.TypeC<{
    typeKey: rt.StringC;
    value: rt.StringC;
    description: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>;
export declare const ObservablePatchRt: rt.ExactC<rt.TypeC<{
    value: rt.StringC;
    description: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>;
export type ObservablePatch = rt.TypeOf<typeof ObservablePatchRt>;
export type ObservablePost = rt.TypeOf<typeof ObservablePostRt>;
export declare const AddObservableRequestRt: rt.ExactC<rt.TypeC<{
    observable: rt.ExactC<rt.TypeC<{
        typeKey: rt.StringC;
        value: rt.StringC;
        description: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
}>>;
export declare const UpdateObservableRequestRt: rt.ExactC<rt.TypeC<{
    observable: rt.ExactC<rt.TypeC<{
        value: rt.StringC;
        description: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
}>>;
export declare const BulkAddObservablesRequestRt: rt.ExactC<rt.TypeC<{
    caseId: rt.StringC;
    observables: rt.ArrayC<rt.ExactC<rt.TypeC<{
        typeKey: rt.StringC;
        value: rt.StringC;
        description: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>>;
}>>;
export type AddObservableRequest = rt.TypeOf<typeof AddObservableRequestRt>;
export type UpdateObservableRequest = rt.TypeOf<typeof UpdateObservableRequestRt>;
export type BulkAddObservablesRequest = rt.TypeOf<typeof BulkAddObservablesRequestRt>;
