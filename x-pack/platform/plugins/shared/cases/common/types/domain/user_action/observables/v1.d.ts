import * as rt from 'io-ts';
declare const ObservablesActionTypeRt: rt.UnionC<[rt.LiteralC<"add">, rt.LiteralC<"delete">, rt.LiteralC<"update">]>;
export declare const ObservablePayloadRt: rt.ExactC<rt.TypeC<{
    count: rt.NumberC;
    actionType: rt.UnionC<[rt.LiteralC<"add">, rt.LiteralC<"delete">, rt.LiteralC<"update">]>;
}>>;
export declare const ObservablesUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    observables: rt.ExactC<rt.TypeC<{
        count: rt.NumberC;
        actionType: rt.UnionC<[rt.LiteralC<"add">, rt.LiteralC<"delete">, rt.LiteralC<"update">]>;
    }>>;
}>>;
export declare const ObservablesUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"observables">;
    payload: rt.ExactC<rt.TypeC<{
        observables: rt.ExactC<rt.TypeC<{
            count: rt.NumberC;
            actionType: rt.UnionC<[rt.LiteralC<"add">, rt.LiteralC<"delete">, rt.LiteralC<"update">]>;
        }>>;
    }>>;
}>>;
export type ObservablesActionType = rt.TypeOf<typeof ObservablesActionTypeRt>;
export {};
